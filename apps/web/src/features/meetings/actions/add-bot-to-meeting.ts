"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { z } from "zod";

const addBotToMeetingSchema = z.object({
  calendarEventId: z.string().min(1, "Calendar event ID is required"),
  meetingUrl: z.string().min(1, "Meeting URL is required"),
  meetingTitle: z.string().optional(),
  consentGiven: z.boolean().optional().default(false),
});

const GOOGLE_MEET_URL_PATTERN = "meet.google.com";

/**
 * Add bot to an existing calendar meeting
 * Creates a bot session linked to the calendar event
 */
export const addBotToMeeting = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "add-bot-to-meeting",
  })
  .schema(addBotToMeetingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { calendarEventId, meetingUrl, meetingTitle, consentGiven } =
      parsedInput;

    // Validate meeting has Google Meet URL
    if (
      !meetingUrl ||
      !meetingUrl.trim() ||
      !meetingUrl.includes(GOOGLE_MEET_URL_PATTERN)
    ) {
      throw ActionErrors.badRequest(
        "Meeting must have a Google Meet link",
        "add-bot-to-meeting"
      );
    }

    // Check if bot session already exists
    const existingSession =
      await BotSessionsQueries.findByCalendarEventId(
        calendarEventId,
        organizationId
      );

    if (existingSession) {
      throw ActionErrors.conflict(
        "Bot is already added to this meeting",
        "add-bot-to-meeting"
      );
    }

    // Get active project
    const project =
      await ProjectQueries.findFirstActiveByOrganization(organizationId);

    if (!project) {
      throw ActionErrors.badRequest(
        "No active project found. Please create or activate a project first.",
        "add-bot-to-meeting"
      );
    }

    // Get bot settings for consent check
    const settingsResult = await getCachedBotSettings(user.id, organizationId);

    if (settingsResult.isErr()) {
      logger.error("Failed to load bot settings", {
        userId: user.id,
        organizationId,
        error: settingsResult.error,
      });
      throw ActionErrors.internal(
        "Failed to load bot settings",
        settingsResult.error,
        "add-bot-to-meeting"
      );
    }

    const { requirePerMeetingConsent } = settingsResult.value;

    // If consent required and not given, return consentRequired for client to show dialog
    if (requirePerMeetingConsent && !consentGiven) {
      return {
        success: false,
        consentRequired: true,
      } as const;
    }

    // User has given consent (either via dialog or requirePerMeetingConsent is false)
    // Always use "scheduled" - bot will join when meeting starts
    const botStatus = "scheduled" as const;

    // Create bot session via provider
    const provider = BotProviderFactory.getDefault();
    const sessionResult = await provider.createSession({
      meetingUrl: meetingUrl.trim(),
      customMetadata: {
        projectId: project.id,
        organizationId,
        userId: user.id,
        calendarEventId,
      },
    });

    if (sessionResult.isErr()) {
      logger.error("Failed to create bot session", {
        userId: user.id,
        calendarEventId,
        error: sessionResult.error.message,
      });
      throw createErrorForNextSafeAction(sessionResult.error);
    }

    const { providerId } = sessionResult.value;

    // Persist bot session to database
    const session = await BotSessionsQueries.insert({
      projectId: project.id,
      organizationId,
      userId: user.id,
      recallBotId: providerId,
      recallStatus: sessionResult.value.status,
      meetingUrl: meetingUrl.trim(),
      meetingTitle: meetingTitle ?? null,
      calendarEventId,
      botStatus,
    });

    // Invalidate bot sessions cache
    CacheInvalidation.invalidateBotSessions(organizationId);

    logger.info("Successfully added bot to meeting", {
      userId: user.id,
      calendarEventId,
      sessionId: session.id,
      botStatus,
    });

    return {
      success: true,
      sessionId: session.id,
      botStatus: session.botStatus,
      calendarEventId,
    } as const;
  });
