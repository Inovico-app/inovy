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
import {
  getCalendarProvider,
  getConnectedProviders,
  getMeetingLinkProvider,
  type ProviderType,
} from "./calendar/calendar-provider-factory";
import type { CalendarEvent } from "./calendar/types";
import { MeetingService } from "./meeting.service";
import { NotificationService } from "./notification.service";

/**
 * A calendar event enriched with its extracted meeting URL and originating provider.
 */
interface EnrichedMeeting {
  event: CalendarEvent;
  meetingUrl: string;
  provider: ProviderType;
}

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
          "BotCalendarMonitorService.monitorCalendars",
        ),
      );
    }
  }

  /**
   * Process calendar for a single user across all connected providers
   */
  private static async processUserCalendar(settings: {
    userId: string;
    organizationId: string;
    calendarIds?: string[] | null;
    requirePerMeetingConsent: boolean;
    botDisplayName: string;
    botJoinMessage: string | null;
  }): Promise<ActionResult<{ sessionsCreated: number }>> {
    try {
      // Discover all connected calendar providers for this user
      const connectedProviders = await getConnectedProviders(settings.userId);

      if (connectedProviders.length === 0) {
        logger.debug("User does not have any calendar provider connected", {
          component: "BotCalendarMonitorService.processUserCalendar",
          userId: settings.userId,
        });
        return ok({ sessionsCreated: 0 });
      }

      // Time window: 10-20 minutes from now
      const now = new Date();
      // timeMin = now + 10min + 15s (join_at offset) + 5s (safety margin) so joinAt is always > 10min from API call (Recall.ai threshold)
      const timeMin = new Date(now.getTime() + (10 * 60 + 15 + 5) * 1000);
      const timeMax = new Date(now.getTime() + 20 * 60 * 1000); // 20 minutes from now

      // Phase 1: Collect meetings from all providers
      const enrichedMeetings: EnrichedMeeting[] = [];

      for (const providerType of connectedProviders) {
        try {
          const meetings = await this.fetchMeetingsFromProvider(
            settings.userId,
            providerType,
            {
              timeMin,
              timeMax,
              calendarIds: settings.calendarIds ?? undefined,
            },
          );
          enrichedMeetings.push(...meetings);
        } catch (error) {
          // Log and continue with the next provider
          logger.error("Failed to fetch meetings from provider", {
            component: "BotCalendarMonitorService.processUserCalendar",
            userId: settings.userId,
            provider: providerType,
            error: serializeError(error),
          });
        }
      }

      if (enrichedMeetings.length === 0) {
        return ok({ sessionsCreated: 0 });
      }

      // Phase 2: Cross-provider deduplication by meeting URL
      const allMeetingUrls = enrichedMeetings.map((m) => m.meetingUrl);
      const existingMeetingUrls = await BotSessionsQueries.findByMeetingUrls(
        allMeetingUrls,
        settings.organizationId,
      );

      // Phase 3: Create bot sessions for new meetings
      let sessionsCreated = 0;

      for (const { event, meetingUrl, provider } of enrichedMeetings) {
        try {
          // Cross-provider dedup: skip if meeting URL is already tracked
          if (existingMeetingUrls.has(meetingUrl)) {
            logger.debug("Meeting URL already tracked (cross-provider dedup)", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              meetingUrl,
              provider,
              calendarEventId: event.id,
            });
            continue;
          }

          // Same-provider dedup: check by calendar event ID
          const existingSession =
            await BotSessionsQueries.findByCalendarEventId(
              event.id,
              settings.organizationId,
            );

          if (existingSession) {
            logger.debug("Bot session already exists for calendar event", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              calendarEventId: event.id,
              sessionId: existingSession.id,
              provider,
            });
            continue;
          }

          // Get project for this organization
          const project = await ProjectQueries.findFirstActiveByOrganization(
            settings.organizationId,
          );

          if (!project) {
            logger.warn("No active project found for organization", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              organizationId: settings.organizationId,
              calendarEventId: event.id,
            });
            continue;
          }

          // Determine bot status based on consent settings
          const botStatus: "scheduled" | "pending_consent" =
            settings.requirePerMeetingConsent ? "pending_consent" : "scheduled";

          // Calculate join time: 15 seconds before meeting start for precision
          if (!event.start) {
            logger.warn("Skipping meeting without start time", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              calendarEventId: event.id,
            });
            continue;
          }
          const joinAt = new Date(event.start.getTime() - 15 * 1000);

          // Create bot session via bot provider
          const botProvider = BotProviderFactory.getDefault();
          const sessionResult = await botProvider.createSession({
            meetingUrl,
            joinAt,
            customMetadata: {
              projectId: project.id,
              organizationId: settings.organizationId,
              userId: settings.userId,
              calendarEventId: event.id,
              provider,
            },
            botDisplayName: settings.botDisplayName,
            botJoinMessage: settings.botJoinMessage,
          });

          if (sessionResult.isErr()) {
            logger.error("Failed to create bot session", {
              component: "BotCalendarMonitorService.processUserCalendar",
              userId: settings.userId,
              calendarEventId: event.id,
              provider,
              error: sessionResult.error.message,
            });
            continue;
          }

          const { providerId } = sessionResult.value;

          // Persist bot session to database
          const session = await BotSessionsQueries.insert({
            projectId: project.id,
            organizationId: settings.organizationId,
            userId: settings.userId,
            recallBotId: providerId,
            recallStatus: sessionResult.value.status,
            meetingUrl,
            meetingTitle: event.title,
            calendarEventId: event.id,
            botStatus: botStatus,
            meetingParticipants:
              event.attendees?.map((a) => a.email).filter(Boolean) ?? undefined,
          });

          // Create or find meeting for this calendar event
          const meetingResult =
            await MeetingService.findOrCreateForCalendarEvent(
              event.id,
              settings.organizationId,
              {
                organizationId: settings.organizationId,
                projectId: project.id,
                createdById: settings.userId,
                calendarEventId: event.id,
                externalCalendarId: event.id,
                title: event.title || "Untitled Meeting",
                description: null,
                scheduledStartAt: event.start ?? new Date(),
                scheduledEndAt: event.end ?? undefined,
                status: "scheduled",
                meetingUrl,
                participants:
                  event.attendees?.map((a) => ({
                    email: a.email,
                    name: null,
                    role: null,
                  })) ?? [],
              },
            );

          if (meetingResult.isOk()) {
            await BotSessionsQueries.update(
              session.id,
              settings.organizationId,
              { meetingId: meetingResult.value.id },
            );
          }

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
                message: `Bot wants to join "${event.title || "meeting"}"`,
                metadata: {
                  sessionId: session.id,
                  meetingTitle: event.title,
                  meetingTime: event.start
                    ? new Date(event.start).toISOString()
                    : undefined,
                  meetingUrl,
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
            calendarEventId: event.id,
            botId: providerId,
            botStatus,
            projectId: project.id,
            provider,
          });
        } catch (error) {
          logger.error("Error processing meeting", {
            component: "BotCalendarMonitorService.processUserCalendar",
            userId: settings.userId,
            calendarEventId: event.id,
            provider,
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
          "BotCalendarMonitorService.processUserCalendar",
        ),
      );
    }
  }

  /**
   * Fetch meetings from a single calendar provider and enrich with meeting URLs.
   * Returns only meetings that have a valid meeting URL.
   */
  private static async fetchMeetingsFromProvider(
    userId: string,
    providerType: ProviderType,
    options: { timeMin: Date; timeMax: Date; calendarIds?: string[] },
  ): Promise<EnrichedMeeting[]> {
    const calendarResult = await getCalendarProvider(userId, providerType);
    if (calendarResult.isErr()) {
      logger.warn("Could not get calendar provider", {
        component: "BotCalendarMonitorService.fetchMeetingsFromProvider",
        userId,
        provider: providerType,
        error: calendarResult.error.message,
      });
      return [];
    }

    const meetingLinkResult = await getMeetingLinkProvider(
      userId,
      providerType,
    );
    if (meetingLinkResult.isErr()) {
      logger.warn("Could not get meeting link provider", {
        component: "BotCalendarMonitorService.fetchMeetingsFromProvider",
        userId,
        provider: providerType,
        error: meetingLinkResult.error.message,
      });
      return [];
    }

    const { provider: calendarProvider } = calendarResult.value;
    const { provider: meetingLinkProvider } = meetingLinkResult.value;

    const meetingsResult = await calendarProvider.getUpcomingMeetings(userId, {
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      calendarIds: options.calendarIds,
    });

    if (meetingsResult.isErr()) {
      logger.error("Failed to fetch upcoming meetings from provider", {
        component: "BotCalendarMonitorService.fetchMeetingsFromProvider",
        userId,
        provider: providerType,
        error: meetingsResult.error.message,
      });
      return [];
    }

    const enriched: EnrichedMeeting[] = [];

    for (const event of meetingsResult.value) {
      const meetingUrl = meetingLinkProvider.extractMeetingUrl(event);
      if (meetingUrl) {
        enriched.push({ event, meetingUrl, provider: providerType });
      } else {
        logger.debug("Skipping event without meeting URL", {
          component: "BotCalendarMonitorService.fetchMeetingsFromProvider",
          userId,
          provider: providerType,
          calendarEventId: event.id,
          title: event.title,
        });
      }
    }

    logger.info("Fetched meetings from provider", {
      component: "BotCalendarMonitorService.fetchMeetingsFromProvider",
      userId,
      provider: providerType,
      totalEvents: meetingsResult.value.length,
      withMeetingUrl: enriched.length,
    });

    return enriched;
  }
}
