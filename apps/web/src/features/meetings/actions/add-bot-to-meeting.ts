"use server";

import { logger } from "@/lib/logger";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  createErrorForNextSafeAction,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { CacheInvalidation } from "@/lib/cache-utils";
import { isValidMeetingUrl } from "@/lib/meeting-url";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { BotProviderFactory } from "@/server/services/bot-providers/factory";
import { MeetingService } from "@/server/services/meeting.service";
import { z } from "zod";

const addBotToMeetingSchema = z.object({
  calendarEventId: z.string().min(1, "Calendar event ID is required"),
  meetingUrl: z.string().min(1, "Meeting URL is required"),
  meetingTitle: z.string().optional(),
  projectId: z.string().uuid("Invalid project ID").optional(),
  teamId: z.string().nullable().optional(),
});

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
    const { user, organizationId, activeTeamId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const {
      calendarEventId,
      meetingUrl,
      meetingTitle,
      projectId,
      teamId: explicitTeamId,
    } = parsedInput;

    const teamId = explicitTeamId ?? activeTeamId ?? null;

    if (
      teamId &&
      !ctx.userTeamIds?.includes(teamId) &&
      !isOrganizationAdmin(user)
    ) {
      throw ActionErrors.forbidden(
        "Not a member of this team",
        undefined,
        "add-bot-to-meeting",
      );
    }

    // Validate meeting has a supported meeting URL (Google Meet or Microsoft Teams)
    if (!meetingUrl?.trim() || !isValidMeetingUrl(meetingUrl)) {
      throw ActionErrors.badRequest(
        "Meeting must have a Google Meet or Microsoft Teams link",
        "add-bot-to-meeting",
      );
    }

    // Check if bot session already exists — allow re-adding after terminal statuses
    const existingSession = await BotSessionsQueries.findByCalendarEventId(
      calendarEventId,
      organizationId,
    );

    const TERMINAL_STATUSES = ["failed", "completed", "removed"] as const;
    if (
      existingSession &&
      !TERMINAL_STATUSES.includes(
        existingSession.botStatus as (typeof TERMINAL_STATUSES)[number],
      )
    ) {
      throw ActionErrors.conflict(
        "Bot is already added to this meeting",
        "add-bot-to-meeting",
      );
    }

    // Get project - use provided projectId or fallback to first active project
    let project;
    if (projectId) {
      const projectById = await ProjectQueries.findById(
        projectId,
        organizationId,
      );
      if (!projectById) {
        throw ActionErrors.badRequest(
          "Selected project not found",
          "add-bot-to-meeting",
        );
      }
      // Verify project is active
      if (projectById.status !== "active") {
        throw ActionErrors.badRequest(
          "Selected project is not active",
          "add-bot-to-meeting",
        );
      }
      // Verify project belongs to the same team
      if (teamId && projectById.teamId && projectById.teamId !== teamId) {
        throw ActionErrors.badRequest(
          "Selected project does not belong to the specified team",
          "add-bot-to-meeting",
        );
      }
      project = projectById;
    } else {
      // Fallback to first active project in the team (or org-wide)
      project = await ProjectQueries.findFirstActiveByOrganization(
        organizationId,
        {
          teamId,
        },
      );

      if (!project) {
        throw ActionErrors.badRequest(
          "No active project found. Please create or activate a project first.",
          "add-bot-to-meeting",
        );
      }
    }

    // Get bot settings for display name and configuration
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
        "add-bot-to-meeting",
      );
    }

    const { botDisplayName, botJoinMessage, inactivityTimeoutMinutes } =
      settingsResult.value;

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
      botDisplayName,
      botJoinMessage,
      inactivityTimeoutMinutes,
    });

    if (sessionResult.isErr()) {
      logger.error("Failed to create bot session", {
        userId: user.id,
        calendarEventId,
        error: sessionResult.error.message,
      });
      throw createErrorForNextSafeAction(sessionResult.error);
    }

    const { providerId, internalStatus: botStatus } = sessionResult.value;

    // Persist bot session to database (cleanup provider session on insert failure)
    let session;
    try {
      session = await BotSessionsQueries.insert({
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
    } catch (insertError) {
      const terminateResult = await provider.terminateSession(providerId);
      if (terminateResult.isErr()) {
        logger.error(
          "Failed to terminate provider session after DB insert error",
          {
            component: "addBotToMeeting",
            providerId,
            originalError: insertError,
            terminateError: terminateResult.error.message,
          },
        );
      }
      throw createErrorForNextSafeAction(
        ActionErrors.internal(
          "Failed to create bot session",
          insertError,
          "add-bot-to-meeting",
        ),
      );
    }

    // Create or find meeting for this calendar event
    const meetingResult = await MeetingService.findOrCreateForCalendarEvent(
      calendarEventId,
      organizationId,
      {
        organizationId,
        projectId: project.id,
        teamId,
        createdById: user.id,
        calendarEventId,
        title: meetingTitle || "Untitled Meeting",
        scheduledStartAt: new Date(),
        status: "scheduled",
        meetingUrl: meetingUrl.trim(),
      },
    );

    if (meetingResult.isOk()) {
      await BotSessionsQueries.update(session.id, organizationId, {
        meetingId: meetingResult.value.id,
      });
    }

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
