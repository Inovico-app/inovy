"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { AutoActionsService } from "@/server/services/auto-actions.service";
import { z } from "zod";

const getGoogleIntegrationStatusSchema = z.object({
  limit: z.number().optional(),
  type: z.enum(["calendar_event", "email_draft"]).optional(),
});

/**
 * Get recent Google integration actions
 */
export const getGoogleIntegrationStatus = authorizedActionClient
  .metadata({ policy: "settings:read" })
  .schema(getGoogleIntegrationStatusSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const [actions, stats] = await Promise.all([
      AutoActionsService.getRecentAutoActions(
        user.id,
        organizationId,
        "google",
        parsedInput
      ),
      AutoActionsService.getAutoActionStats(user.id, organizationId, "google"),
    ]);

    if (actions.isErr()) {
      logger.error("Failed to get recent auto actions", {
        userId: user.id,
        error: actions.error,
      });
    }

    if (stats.isErr()) {
      logger.error("Failed to get auto action stats", {
        userId: user.id,
        error: stats.error,
      });
    }

    return {
      actions: actions.isOk() ? actions.value : [],
      stats: stats.isOk()
        ? stats.value
        : {
            total: 0,
            completed: 0,
            failed: 0,
            pending: 0,
            calendarEvents: 0,
            emailDrafts: 0,
          },
    };
  });

const retryFailedActionSchema = z.object({
  actionId: z.string(),
});

/**
 * Retry a failed action
 */
export const retryFailedAction = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(retryFailedActionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const action = await AutoActionsService.retryAutoAction(
      parsedInput.actionId,
      user.id,
      organizationId
    );

    if (!action) {
      throw ActionErrors.notFound("Action", "retry-failed-action");
    }

    logger.info("Retrying failed auto action", {
      userId: user.id,
      actionId: parsedInput.actionId,
    });

    return { success: true };
  });

