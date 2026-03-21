"use server";

import { logger } from "@/lib/logger";
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
import { z } from "zod";

const addNotetakerByUrlSchema = z.object({
  meetingUrl: z.string().min(1, "Meeting URL is required"),
  projectId: z.string().uuid("Invalid project ID"),
});

/**
 * Add a notetaker to a meeting by pasting a meeting URL.
 * Creates a bot session without requiring a calendar event.
 */
export const addNotetakerByUrl = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "add-notetaker-by-url",
    audit: {
      resourceType: "bot_session",
      action: "create",
      category: "mutation",
    },
  })
  .schema(addNotetakerByUrlSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { meetingUrl, projectId } = parsedInput;

    if (!isValidMeetingUrl(meetingUrl)) {
      throw ActionErrors.badRequest(
        "Please enter a valid Google Meet or Microsoft Teams link",
        "add-notetaker-by-url",
      );
    }

    // Verify project exists and is active
    const project = await ProjectQueries.findById(projectId, organizationId);
    if (!project || project.status !== "active") {
      throw ActionErrors.badRequest(
        "Selected project not found or not active",
        "add-notetaker-by-url",
      );
    }

    // Get bot settings
    const settingsResult = await getCachedBotSettings(user.id, organizationId);
    if (settingsResult.isErr()) {
      throw ActionErrors.internal(
        "Failed to load notetaker settings",
        settingsResult.error,
        "add-notetaker-by-url",
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
      },
      botDisplayName,
      botJoinMessage,
      inactivityTimeoutMinutes,
    });

    if (sessionResult.isErr()) {
      logger.error("Failed to create notetaker session from URL", {
        userId: user.id,
        projectId: project.id,
        error: sessionResult.error.message,
      });
      throw createErrorForNextSafeAction(sessionResult.error);
    }

    const { providerId, internalStatus: botStatus } = sessionResult.value;

    // Persist bot session to database
    let session;
    try {
      session = await BotSessionsQueries.insert({
        projectId: project.id,
        organizationId,
        userId: user.id,
        recallBotId: providerId,
        recallStatus: sessionResult.value.status,
        meetingUrl: meetingUrl.trim(),
        meetingTitle: null,
        calendarEventId: null,
        botStatus,
      });
    } catch (insertError) {
      const terminateResult = await provider.terminateSession(providerId);
      if (terminateResult.isErr()) {
        logger.error(
          "Failed to terminate provider session after DB insert error",
          {
            component: "addNotetakerByUrl",
            providerId,
            originalError: insertError,
            terminateError: terminateResult.error.message,
          },
        );
      }
      throw createErrorForNextSafeAction(
        ActionErrors.internal(
          "Failed to create notetaker session",
          insertError,
          "add-notetaker-by-url",
        ),
      );
    }

    // Invalidate bot sessions cache
    CacheInvalidation.invalidateBotSessions(organizationId);

    logger.info("Successfully added notetaker by URL", {
      userId: user.id,
      sessionId: session.id,
      botStatus,
    });

    return {
      success: true,
      sessionId: session.id,
      botStatus: session.botStatus,
    } as const;
  });
