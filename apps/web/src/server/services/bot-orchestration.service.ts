import { err, ok } from "neverthrow";
import { logger, serializeError } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { BotSessionsQueries } from "../data-access/bot-sessions.queries";
import { BotProviderFactory } from "./bot-providers/factory";

/**
 * Bot Orchestration Service
 * Handles retry logic for failed bot sessions
 */
export class BotOrchestrationService {
  /**
   * Retry failed bot sessions
   * Finds sessions with botStatus='failed' and retryCount < maxRetries
   * Attempts to recreate bot session via provider
   */
  static async retryFailedSessions(options?: {
    maxRetries?: number; // Default: 3
    maxAgeHours?: number; // Default: 24 hours
  }): Promise<
    ActionResult<{
      sessionsRetried: number;
      successful: number;
      errors: Array<{ sessionId: string; error: string }>;
    }>
  > {
    try {
      const maxRetries = options?.maxRetries ?? 3;
      const maxAgeHours = options?.maxAgeHours ?? 24;

      logger.info("Starting retry of failed bot sessions", {
        component: "BotOrchestrationService.retryFailedSessions",
        maxRetries,
        maxAgeHours,
      });

      // Find failed sessions that can be retried
      const sessionsToRetry =
        await BotSessionsQueries.findFailedSessionsForRetry({
          maxRetries,
          maxAgeHours,
          limit: 100,
        });

      if (sessionsToRetry.length === 0) {
        logger.info("No failed sessions found needing retry", {
          component: "BotOrchestrationService.retryFailedSessions",
        });
        return ok({
          sessionsRetried: 0,
          successful: 0,
          errors: [],
        });
      }

      logger.info("Found sessions to retry", {
        component: "BotOrchestrationService.retryFailedSessions",
        count: sessionsToRetry.length,
      });

      const errors: Array<{ sessionId: string; error: string }> = [];
      let successful = 0;
      const provider = BotProviderFactory.getDefault();

      // Retry each session
      for (const session of sessionsToRetry) {
        try {
          // Verify meeting URL is still valid (basic check - not empty)
          if (!session.meetingUrl || session.meetingUrl.trim() === "") {
            errors.push({
              sessionId: session.id,
              error: "Meeting URL is empty or invalid",
            });
            logger.warn("Skipping retry - invalid meeting URL", {
              component: "BotOrchestrationService.retryFailedSessions",
              sessionId: session.id,
            });
            continue;
          }

          // Attempt to recreate bot session
          const customMetadata: Record<string, string> = {
            organizationId: session.organizationId,
            userId: session.userId,
            projectId: session.projectId,
          };

          // Only include calendarEventId if it exists
          if (session.calendarEventId) {
            customMetadata.calendarEventId = session.calendarEventId;
          }

          const createResult = await provider.createSession({
            meetingUrl: session.meetingUrl,
            customMetadata,
          });

          if (createResult.isErr()) {
            // Increment retry count
            await BotSessionsQueries.incrementRetryCount(
              session.id,
              session.organizationId
            );

            errors.push({
              sessionId: session.id,
              error: createResult.error.message,
            });

            logger.warn("Failed to recreate bot session", {
              component: "BotOrchestrationService.retryFailedSessions",
              sessionId: session.id,
              recallBotId: session.recallBotId,
              retryCount: session.retryCount + 1,
              error: createResult.error,
            });

            // Check if max retries reached
            if (session.retryCount + 1 >= maxRetries) {
              logger.error("Max retries reached for session", {
                component: "BotOrchestrationService.retryFailedSessions",
                sessionId: session.id,
                retryCount: session.retryCount + 1,
              });
            }

            continue;
          }

          const { providerId, status, internalStatus } = createResult.value;

          // Update session with new bot ID, reset status, and increment retry count atomically
          const updatedSession =
            await BotSessionsQueries.updateAndIncrementRetryCount(
              session.id,
              session.organizationId,
              {
                recallBotId: providerId, // Update to new bot ID
                recallStatus: status,
                botStatus: internalStatus,
                error: null, // Clear previous error
              }
            );

          if (!updatedSession) {
            errors.push({
              sessionId: session.id,
              error: "Failed to update session and increment retry count",
            });
            logger.error("Failed to update session and increment retry count", {
              component: "BotOrchestrationService.retryFailedSessions",
              sessionId: session.id,
            });
            continue;
          }

          successful++;
          logger.info("Successfully retried bot session", {
            component: "BotOrchestrationService.retryFailedSessions",
            sessionId: session.id,
            oldRecallBotId: session.recallBotId,
            newRecallBotId: providerId,
            retryCount: session.retryCount + 1,
          });
        } catch (error) {
          // Increment retry count even on exception
          await BotSessionsQueries.incrementRetryCount(
            session.id,
            session.organizationId
          ).catch((err) => {
            logger.error("Failed to increment retry count", {
              component: "BotOrchestrationService.retryFailedSessions",
              sessionId: session.id,
              error: serializeError(err),
            });
          });

          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Unknown error";
          errors.push({
            sessionId: session.id,
            error: errorMessage,
          });

          logger.error("Error retrying session", {
            component: "BotOrchestrationService.retryFailedSessions",
            sessionId: session.id,
            error: serializeError(error),
          });
        }
      }

      logger.info("Completed retry of failed bot sessions", {
        component: "BotOrchestrationService.retryFailedSessions",
        sessionsRetried: sessionsToRetry.length,
        successful,
        errors: errors.length,
      });

      return ok({
        sessionsRetried: sessionsToRetry.length,
        successful,
        errors,
      });
    } catch (error) {
      logger.error("Failed to retry failed sessions", {
        component: "BotOrchestrationService.retryFailedSessions",
        error: serializeError(error),
      });

      const normalizedError =
        error instanceof Error
          ? error
          : new Error(
              typeof error === "string" ? error : JSON.stringify(error)
            );

      return err(
        ActionErrors.internal(
          "Failed to retry failed sessions",
          normalizedError,
          "BotOrchestrationService.retryFailedSessions"
        )
      );
    }
  }
}

