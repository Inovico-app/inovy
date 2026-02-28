import { err, ok } from "neverthrow";
import { logger, serializeError } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { BotSessionsQueries } from "../data-access/bot-sessions.queries";
import { type BotStatus } from "../db/schema/bot-sessions";
import { BotProviderFactory } from "./bot-providers/factory";

/**
 * Bot Status Poll Service
 * Polls active bot sessions to check their current status
 * Used as a fallback mechanism when webhooks are missed
 */
export class BotStatusPollService {
  /**
   * Poll status for active bot sessions
   * Finds sessions in 'joining' or 'active' status and checks their current status
   * Updates database with latest status from provider
   */
  static async pollActiveSessions(): Promise<
    ActionResult<{
      sessionsPolled: number;
      statusUpdates: number;
      errors: Array<{ sessionId: string; error: string }>;
    }>
  > {
    try {
      logger.info("Starting bot status polling", {
        component: "BotStatusPollService.pollActiveSessions",
      });

      // Get all unique organizations that have active sessions needing polling
      const organizationIds =
        await BotSessionsQueries.findOrganizationsWithActiveSessions({
          maxAgeHours: 4,
          statuses: ["joining", "active"],
          limit: 1000,
        });

      if (organizationIds.length === 0) {
        logger.info("No organizations found with active sessions", {
          component: "BotStatusPollService.pollActiveSessions",
        });
        return ok({
          sessionsPolled: 0,
          statusUpdates: 0,
          errors: [],
        });
      }

      let totalSessionsPolled = 0;
      let totalStatusUpdates = 0;
      const allErrors: Array<{ sessionId: string; error: string }> = [];

      // Poll sessions for each organization
      for (const organizationId of organizationIds) {
        const result =
          await this.pollActiveSessionsForOrganization(organizationId);

        if (result.isOk()) {
          totalSessionsPolled += result.value.sessionsPolled;
          totalStatusUpdates += result.value.statusUpdates;
          allErrors.push(...result.value.errors);
        } else {
          logger.error("Failed to poll sessions for organization", {
            component: "BotStatusPollService.pollActiveSessions",
            organizationId,
            error: result.error,
          });
          // Continue with other organizations even if one fails
        }
      }

      logger.info("Completed bot status polling", {
        component: "BotStatusPollService.pollActiveSessions",
        organizationsProcessed: organizationIds.length,
        totalSessionsPolled,
        totalStatusUpdates,
        totalErrors: allErrors.length,
      });

      return ok({
        sessionsPolled: totalSessionsPolled,
        statusUpdates: totalStatusUpdates,
        errors: allErrors,
      });
    } catch (error) {
      logger.error("Failed to poll active sessions", {
        component: "BotStatusPollService.pollActiveSessions",
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
          "Failed to poll active sessions",
          normalizedError,
          "BotStatusPollService.pollActiveSessions"
        )
      );
    }
  }

  /**
   * Poll status for active bot sessions in a specific organization
   */
  static async pollActiveSessionsForOrganization(
    organizationId: string
  ): Promise<
    ActionResult<{
      sessionsPolled: number;
      statusUpdates: number;
      errors: Array<{ sessionId: string; error: string }>;
    }>
  > {
    try {
      const errors: Array<{ sessionId: string; error: string }> = [];
      let sessionsPolled = 0;
      let statusUpdates = 0;

      logger.info("Polling bot sessions for organization", {
        component: "BotStatusPollService.pollActiveSessionsForOrganization",
        organizationId,
      });

      // Find sessions that need polling
      const sessions = await BotSessionsQueries.findSessionsNeedingPolling(
        organizationId,
        {
          maxAgeHours: 4,
          statuses: ["joining", "active"],
          limit: 100,
        }
      );

      sessionsPolled = sessions.length;

      if (sessions.length === 0) {
        logger.info("No sessions found needing polling", {
          component: "BotStatusPollService.pollActiveSessionsForOrganization",
          organizationId,
        });
        return ok({
          sessionsPolled: 0,
          statusUpdates: 0,
          errors: [],
        });
      }

      const provider = BotProviderFactory.getDefault();

      // Poll each session
      for (const session of sessions) {
        try {
          // Get current status from provider
          const statusResult = await provider.getSessionStatus(
            session.recallBotId
          );

          if (statusResult.isErr()) {
            errors.push({
              sessionId: session.id,
              error: statusResult.error.message,
            });
            logger.warn("Failed to get session status from provider", {
              component:
                "BotStatusPollService.pollActiveSessionsForOrganization",
              sessionId: session.id,
              recallBotId: session.recallBotId,
              error: statusResult.error,
            });
            continue;
          }

          const { status: providerStatus, internalStatus } = statusResult.value;

          // Check if status has changed
          if (
            providerStatus !== session.recallStatus ||
            internalStatus !== session.botStatus
          ) {
            // Status changed, update session using same logic as webhook handler
            const updates: Partial<{
              recallStatus: string;
              botStatus: BotStatus;
              joinedAt: Date | null;
              leftAt: Date | null;
              error: string | null;
            }> = {
              recallStatus: providerStatus,
              botStatus: internalStatus,
            };

            // Set joinedAt when bot becomes active (if not already set)
            if (internalStatus === "active" && !session.joinedAt) {
              updates.joinedAt = new Date();
            }

            // Set leftAt when bot leaves or completes (if not already set)
            if (
              (internalStatus === "leaving" ||
                internalStatus === "completed") &&
              !session.leftAt
            ) {
              updates.leftAt = new Date();
            }

            // Handle failures
            if (internalStatus === "failed") {
              updates.error = `Bot failed: ${providerStatus}`;
            }

            // Update session
            const updatedSession = await BotSessionsQueries.updateByRecallBotId(
              session.recallBotId,
              organizationId,
              updates
            );

            if (updatedSession) {
              statusUpdates++;
              logger.info("Updated bot session status from polling", {
                component:
                  "BotStatusPollService.pollActiveSessionsForOrganization",
                sessionId: session.id,
                recallBotId: session.recallBotId,
                oldStatus: session.recallStatus,
                newStatus: providerStatus,
                oldBotStatus: session.botStatus,
                newBotStatus: internalStatus,
              });
            } else {
              errors.push({
                sessionId: session.id,
                error: "Failed to update session status",
              });
              logger.error("Failed to update session status", {
                component:
                  "BotStatusPollService.pollActiveSessionsForOrganization",
                sessionId: session.id,
                recallBotId: session.recallBotId,
                oldStatus: session.recallStatus,
                newStatus: providerStatus,
                oldBotStatus: session.botStatus,
                newBotStatus: internalStatus,
              });
            }
          }
        } catch (error) {
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
          logger.error("Error polling session", {
            component: "BotStatusPollService.pollActiveSessionsForOrganization",
            sessionId: session.id,
            recallBotId: session.recallBotId,
            error: serializeError(error),
          });
        }
      }

      logger.info("Completed bot status polling", {
        component: "BotStatusPollService.pollActiveSessionsForOrganization",
        organizationId,
        sessionsPolled,
        statusUpdates,
        errors: errors.length,
      });

      return ok({
        sessionsPolled,
        statusUpdates,
        errors,
      });
    } catch (error) {
      logger.error("Failed to poll active sessions", {
        component: "BotStatusPollService.pollActiveSessionsForOrganization",
        organizationId,
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
          "Failed to poll active sessions",
          normalizedError,
          "BotStatusPollService.pollActiveSessionsForOrganization"
        )
      );
    }
  }
}

