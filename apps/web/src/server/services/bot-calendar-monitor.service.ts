import { err, ok } from "neverthrow";
import { logger, serializeError } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { BotSessionsQueries } from "../data-access/bot-sessions.queries";
import { BotSettingsQueries } from "../data-access/bot-settings.queries";
import { ProjectQueries } from "../data-access/projects.queries";
import { BotProviderFactory } from "./bot-providers/factory";
import { GoogleCalendarService } from "./google-calendar.service";
import { GoogleOAuthService } from "./google-oauth.service";
import { NotificationService } from "./notification.service";

/**
 * Bot Calendar Monitor Service
 * Orchestrates calendar monitoring workflow for bot sessions
 */
export class BotCalendarMonitorService {
  /**
   * Monitor calendars for all users with bot enabled
   * @returns Result with count of sessions created
   */
  static async monitorCalendars(): Promise<
    ActionResult<{
      usersProcessed: number;
      sessionsCreated: number;
      errors: Array<{ userId: string; error: string }>;
    }>
  > {
    try {
      logger.info("Starting calendar monitoring workflow", {
        component: "BotCalendarMonitorService.monitorCalendars",
      });

      // Get all users with bot enabled
      const botSettings = await BotSettingsQueries.findAllEnabled();

      logger.info("Found users with bot enabled", {
        component: "BotCalendarMonitorService.monitorCalendars",
        count: botSettings.length,
      });

      const results = {
        usersProcessed: 0,
        sessionsCreated: 0,
        errors: [] as Array<{ userId: string; error: string }>,
      };

      // Process each user
      for (const settings of botSettings) {
        try {
          const userResult = await this.processUserCalendar(settings);

          if (userResult.isOk()) {
            results.usersProcessed++;
            results.sessionsCreated += userResult.value.sessionsCreated;
          } else {
            results.errors.push({
              userId: settings.userId,
              error: userResult.error.message,
            });
          }
        } catch (error) {
          logger.error("Error processing user calendar", {
            component: "BotCalendarMonitorService.monitorCalendars",
            userId: settings.userId,
            error: serializeError(error),
          });

          results.errors.push({
            userId: settings.userId,
            error:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      }

      logger.info("Calendar monitoring workflow completed", {
        component: "BotCalendarMonitorService.monitorCalendars",
        results,
      });

      return ok(results);
    } catch (error) {
      logger.error("Failed to monitor calendars", {
        component: "BotCalendarMonitorService.monitorCalendars",
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to monitor calendars",
          error as Error,
          "BotCalendarMonitorService.monitorCalendars"
        )
      );
    }
  }

  /**
   * Process calendar for a single user
   */
  private static async processUserCalendar(settings: {
    userId: string;
    organizationId: string;
    calendarIds?: string[] | null;
    requirePerMeetingConsent: boolean;
  }): Promise<ActionResult<{ sessionsCreated: number }>> {
    try {
      // Verify user has Google OAuth connection
      const connectionResult = await GoogleOAuthService.hasConnection(
        settings.userId
      );

      if (connectionResult.isErr() || !connectionResult.value) {
        logger.debug("User does not have Google connection", {
          component: "BotCalendarMonitorService.processUserCalendar",
          userId: settings.userId,
        });
        return ok({ sessionsCreated: 0 });
      }

      // Get upcoming meetings (15-20 minutes window to allow scheduled bot creation)
      const now = new Date();
      const timeMin = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now (minimum for scheduled bots)
      const timeMax = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

      const meetingsResult = await GoogleCalendarService.getUpcomingMeetings(
        settings.userId,
        {
          timeMin,
          timeMax,
          calendarIds: settings.calendarIds ?? undefined,
        }
      );

      if (meetingsResult.isErr()) {
        return err(meetingsResult.error);
      }

      const meetings = meetingsResult.value;
      let sessionsCreated = 0;

      // Process each meeting
      for (const meeting of meetings) {
        try {
          // Check if session already exists
          const existingSession =
            await BotSessionsQueries.findByCalendarEventId(
              meeting.id,
              settings.organizationId
            );

          if (existingSession) {
            logger.debug("Bot session already exists for calendar event", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              calendarEventId: meeting.id,
              sessionId: existingSession.id,
            });
            continue;
          }

          // Get project for this organization
          const project = await ProjectQueries.findFirstActiveByOrganization(
            settings.organizationId
          );

          if (!project) {
            logger.warn("No active project found for organization", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              organizationId: settings.organizationId,
              calendarEventId: meeting.id,
            });
            continue;
          }

          // Determine bot status based on consent settings
          const botStatus: "scheduled" | "pending_consent" =
            settings.requirePerMeetingConsent ? "pending_consent" : "scheduled";

          // Calculate join time: 15 seconds before meeting start for precision
          const joinAt = new Date(meeting.start.getTime() - 15 * 1000);

          // Create bot session via provider
          const provider = BotProviderFactory.getDefault();
          const sessionResult = await provider.createSession({
            meetingUrl: meeting.meetingUrl,
            joinAt,
            customMetadata: {
              projectId: project.id,
              organizationId: settings.organizationId,
              userId: settings.userId,
              calendarEventId: meeting.id,
            },
          });

          if (sessionResult.isErr()) {
            logger.error("Failed to create bot session", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              calendarEventId: meeting.id,
              error: sessionResult.error.message,
            });
            continue;
          }

          const { providerId, internalStatus } = sessionResult.value;

          // Persist bot session to database
          const session = await BotSessionsQueries.insert({
            projectId: project.id,
            organizationId: settings.organizationId,
            userId: settings.userId,
            recallBotId: providerId,
            recallStatus: sessionResult.value.status,
            meetingUrl: meeting.meetingUrl,
            meetingTitle: meeting.title,
            calendarEventId: meeting.id,
            botStatus: botStatus,
            meetingParticipants:
              meeting.attendees?.map((a) => a.email).filter(Boolean) ??
              undefined,
          });

          // Create notification if consent is required
          if (botStatus === "pending_consent") {
            const notificationResult =
              await NotificationService.createNotification({
                recordingId: null, // No recording yet
                projectId: project.id,
                userId: settings.userId,
                organizationId: settings.organizationId,
                type: "bot_consent_request",
                title: "Bot consent required",
                message: `Bot wants to join "${meeting.title || "meeting"}"`,
                metadata: {
                  sessionId: session.id,
                  meetingTitle: meeting.title,
                  meetingTime: meeting.start
                    ? new Date(meeting.start).toISOString()
                    : undefined,
                  meetingUrl: meeting.meetingUrl,
                },
              });

            if (notificationResult.isErr()) {
              logger.error("Failed to create bot consent notification", {
                component: "BotCalendarMonitorService.processUserCalendar",
                userId: settings.userId,
                sessionId: session.id,
                projectId: project.id,
                error: notificationResult.error.message,
              });
              // Continue - notification failure should not block session creation
            }
          }

          sessionsCreated++;

          logger.info("Created bot session for calendar event", {
            component: "BotCalendarMonitorService.processUserCalendar",
            userId: settings.userId,
            calendarEventId: meeting.id,
            botId: providerId,
            botStatus,
            projectId: project.id,
          });
        } catch (error) {
          logger.error("Error processing meeting", {
            component: "BotCalendarMonitorService.processUserCalendar",
            userId: settings.userId,
            calendarEventId: meeting.id,
            error: serializeError(error),
          });
          // Continue with next meeting
        }
      }

      return ok({ sessionsCreated });
    } catch (error) {
      logger.error("Failed to process user calendar", {
        component: "BotCalendarMonitorService.processUserCalendar",
        userId: settings.userId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to process user calendar",
          error as Error,
          "BotCalendarMonitorService.processUserCalendar"
        )
      );
    }
  }
}

