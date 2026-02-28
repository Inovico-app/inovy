"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

const createCalendarEventWithBotSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDateTime: z.coerce.date(),
  duration: z.number().min(15).max(480).default(30), // 15 min to 8 hours, default 30
  description: z.string().optional(),
  location: z.string().optional(),
  calendarId: z.string().default("primary"),
  addBot: z.boolean().default(true),
  attendeeUserIds: z.array(z.string()).default([]),
  attendeeEmails: z.array(z.string().email()).default([]),
  allDay: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  recurrence: z.array(z.string()).optional(),
  userTimezone: z.string().optional(),
});

/**
 * Create a Google Calendar event with optional bot session
 */
export const createCalendarEventWithBot = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create") })
  .schema(createCalendarEventWithBotSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user has Google connection with calendarWrite scope
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest(
        "Google account not connected. Please connect in settings first."
      );
    }

    const hasScopeResult = await GoogleOAuthService.hasScopes(
      user.id,
      "calendarWrite"
    );

    if (hasScopeResult.isErr()) {
      throw ActionErrors.internal(
        "Failed to verify calendar scopes",
        hasScopeResult.error,
        "createCalendarEventWithBot"
      );
    }

    if (!hasScopeResult.value) {
      throw ActionErrors.badRequest(
        "Missing permission: Calendar (create & edit events). Please grant this permission in Settings > Integrations."
      );
    }

    const {
      title,
      startDateTime,
      duration,
      description,
      location,
      calendarId,
      addBot,
      attendeeUserIds,
      attendeeEmails,
      allDay,
      startDate,
      endDate,
      recurrence,
      userTimezone,
    } = parsedInput;

    logger.info("Creating calendar event with bot", {
      userId: user.id,
      organizationId,
      title,
      addBot,
      allDay,
    });

    // Calculate end time or use date strings for all-day events
    let start: Date;
    let end: Date;

    if (allDay && startDate && endDate) {
      // All-day events: use date strings (YYYY-MM-DD format)
      start = new Date(`${startDate}T00:00:00`);
      end = new Date(`${endDate}T23:59:59`);
    } else {
      // Timed events: calculate from startDateTime and duration
      start = new Date(startDateTime);
      end = new Date(start.getTime() + duration * 60 * 1000);
    }

    // Collect attendee emails
    const attendeeEmailList: string[] = [...(attendeeEmails || [])];

    // Get emails for organization user IDs
    if (attendeeUserIds && attendeeUserIds.length > 0) {
      try {
        const members = await OrganizationQueries.getMembers(organizationId);
        const userIdToEmail = new Map(members.map((m) => [m.id, m.email]));

        for (const attendeeUserId of attendeeUserIds) {
          const email = userIdToEmail.get(attendeeUserId);
          if (email) {
            attendeeEmailList.push(email);
          }
        }
      } catch (error) {
        logger.warn(
          "Failed to fetch organization member emails for attendees",
          {
            userId: user.id,
            organizationId,
            error,
          }
        );
        // Continue without organization user emails - custom emails will still be added
      }
    }

    // Create calendar event
    const eventResult = await GoogleCalendarService.createEvent(user.id, {
      title,
      start,
      end,
      description,
      location,
      calendarId,
      attendees: attendeeEmailList.length > 0 ? attendeeEmailList : undefined,
      allDay: allDay || false,
      userTimezone:
        userTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      recurrence,
    });

    if (eventResult.isErr()) {
      logger.error("Failed to create calendar event", {
        userId: user.id,
        error: eventResult.error.message,
      });

      throw ActionErrors.internal(
        eventResult.error.message,
        eventResult.error,
        "create-calendar-event-with-bot"
      );
    }

    const { eventId, eventUrl, meetingUrl } = eventResult.value;

    let sessionId: string | undefined;
    let botError: string | undefined;

    // Create bot session if requested
    if (addBot) {
      if (!meetingUrl) {
        botError =
          "Calendar event created successfully, but no Google Meet link was generated. Bot session cannot be created.";
        logger.warn("No meeting URL in calendar event", {
          userId: user.id,
          eventId,
        });
      } else {
        try {
          // Get bot settings to determine bot status
          const settingsResult = await getCachedBotSettings(
            user.id,
            organizationId
          );

          if (settingsResult.isErr()) {
            botError =
              "Calendar event created successfully, but failed to load bot settings. Bot session not created.";
            logger.error("Failed to load bot settings", {
              userId: user.id,
              error: settingsResult.error,
            });
          } else {
            // Get active project for organization
            const project =
              await ProjectQueries.findFirstActiveByOrganization(
                organizationId
              );

            if (!project) {
              botError =
                "Calendar event created successfully, but no active project found. Bot session not created.";
              logger.warn("No active project found", {
                userId: user.id,
                organizationId,
              });
            } else {
              const {
                botDisplayName,
                botJoinMessage,
                inactivityTimeoutMinutes,
              } = settingsResult.value;

              // Create bot session via provider
              const provider = BotProviderFactory.getDefault();
              const sessionResult = await provider.createSession({
                meetingUrl,
                customMetadata: {
                  projectId: project.id,
                  organizationId,
                  userId: user.id,
                  calendarEventId: eventId,
                },
                botDisplayName,
                botJoinMessage,
                inactivityTimeoutMinutes,
              });

              if (sessionResult.isErr()) {
                botError = `Calendar event created successfully, but bot session creation failed: ${sessionResult.error.message}`;
                logger.error("Failed to create bot session", {
                  userId: user.id,
                  eventId,
                  error: sessionResult.error.message,
                });
              } else {
                const { providerId, internalStatus } = sessionResult.value;

                // Persist bot session to database
                const session = await BotSessionsQueries.insert({
                  projectId: project.id,
                  organizationId,
                  userId: user.id,
                  recallBotId: providerId,
                  recallStatus: sessionResult.value.status,
                  meetingUrl,
                  meetingTitle: title,
                  calendarEventId: eventId,
                  botStatus: internalStatus,
                });

                sessionId = session.id;

                logger.info("Successfully created bot session", {
                  userId: user.id,
                  eventId,
                  sessionId: session.id,
                });
              }
            }
          }
        } catch (error) {
          botError = `Calendar event created successfully, but bot session creation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          logger.error("Unexpected error creating bot session", {
            userId: user.id,
            eventId,
            error,
          });
        }
      }
    }

    return {
      eventId,
      eventUrl,
      sessionId,
      error: botError,
    };
  });

