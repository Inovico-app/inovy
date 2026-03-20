"use server";

import { logger } from "@/lib/logger";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { OrganizationQueries } from "@/server/data-access/organization.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { getCalendarProvider } from "@/server/services/calendar/calendar-provider-factory";
import type { ProviderType } from "@/server/services/calendar/calendar-provider-factory";
import { MeetingService } from "@/server/services/meeting.service";
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
  provider: z
    .enum(["google", "microsoft"] satisfies [ProviderType, ...ProviderType[]])
    .optional(),
  teamId: z.string().nullable().optional(),
});

/**
 * Create a calendar event with optional bot session.
 * Uses the factory to resolve the connected calendar provider (Google or Microsoft).
 */
export const createCalendarEventWithBot = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:create") })
  .schema(createCalendarEventWithBotSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user, activeTeamId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Resolve connected calendar provider (Google or Microsoft)
    const providerResult = await getCalendarProvider(
      user.id,
      parsedInput.provider,
    );

    if (providerResult.isErr()) {
      throw ActionErrors.badRequest(
        "No calendar account connected. Please connect Google or Microsoft in settings first.",
      );
    }

    const { provider } = providerResult.value;

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
      teamId: explicitTeamId,
    } = parsedInput;

    const teamId =
      explicitTeamId !== undefined ? explicitTeamId : (activeTeamId ?? null);

    if (
      teamId &&
      !ctx.userTeamIds?.includes(teamId) &&
      !isOrganizationAdmin(user)
    ) {
      throw ActionErrors.forbidden(
        "Not a member of this team",
        undefined,
        "create-calendar-event-with-bot",
      );
    }

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
          },
        );
        // Continue without organization user emails - custom emails will still be added
      }
    }

    // Create calendar event via provider
    const eventResult = await provider.createEvent(user.id, {
      title,
      startDateTime: start,
      endDateTime: end,
      description,
      location,
      calendarId,
      attendees: attendeeEmailList.length > 0 ? attendeeEmailList : undefined,
      addOnlineMeeting: true,
      timeZone:
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
        "create-calendar-event-with-bot",
      );
    }

    const { eventId, eventUrl, meetingUrl } = eventResult.value;

    let sessionId: string | undefined;
    let botError: string | undefined;

    // Create bot session if requested
    if (addBot) {
      if (!meetingUrl) {
        botError =
          "Calendar event created successfully, but no meeting link was generated. Bot session cannot be created.";
        logger.warn("No meeting URL in calendar event", {
          userId: user.id,
          eventId,
        });
      } else {
        try {
          // Get bot settings to determine bot status
          const settingsResult = await getCachedBotSettings(
            user.id,
            organizationId,
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
                organizationId,
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
              const botProvider = BotProviderFactory.getDefault();
              const sessionResult = await botProvider.createSession({
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

                // Create or find meeting for this calendar event, passing teamId
                const meetingResult =
                  await MeetingService.findOrCreateForCalendarEvent(
                    eventId,
                    organizationId,
                    {
                      organizationId,
                      projectId: project.id,
                      teamId,
                      createdById: user.id,
                      calendarEventId: eventId,
                      title,
                      scheduledStartAt: start,
                      status: "scheduled",
                      meetingUrl,
                    },
                  );

                if (meetingResult.isOk()) {
                  await BotSessionsQueries.update(session.id, organizationId, {
                    meetingId: meetingResult.value.id,
                  });
                }

                CacheInvalidation.invalidateBotSessions(organizationId);

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
