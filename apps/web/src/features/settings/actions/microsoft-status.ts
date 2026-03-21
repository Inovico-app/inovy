"use server";

import { logger } from "@/lib/logger";
import { Permissions } from "@/lib/rbac/permissions";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AutoActionsService } from "@/server/services/auto-actions.service";
import { z } from "zod";

const getMicrosoftIntegrationStatusSchema = z.object({
  limit: z.number().optional(),
  type: z.enum(["calendar_event", "email_draft"]).optional(),
});

/**
 * Get recent Microsoft integration actions
 */
export const getMicrosoftIntegrationStatus = authorizedActionClient
  .metadata({
    name: "get-microsoft-integration-status",
    permissions: Permissions.integration.manage,
    audit: { resourceType: "integration", action: "get", category: "read" },
  })
  .schema(getMicrosoftIntegrationStatusSchema.optional())
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
        "microsoft",
        parsedInput,
      ),
      AutoActionsService.getAutoActionStats(
        user.id,
        organizationId,
        "microsoft",
      ),
    ]);

    if (actions.isErr()) {
      logger.error("Failed to get recent Microsoft auto actions", {
        userId: user.id,
        error: actions.error,
      });

      throw ActionErrors.internal(
        "Failed to retrieve recent Microsoft actions",
        actions.error,
        "get-microsoft-integration-status",
      );
    }

    if (stats.isErr()) {
      logger.error("Failed to get Microsoft auto action stats", {
        userId: user.id,
        error: stats.error,
      });

      throw ActionErrors.internal(
        "Failed to retrieve Microsoft action statistics",
        stats.error,
        "get-microsoft-integration-status",
      );
    }

    return {
      actions: actions.value,
      stats: stats.value,
    };
  });

const retryMicrosoftFailedActionSchema = z.object({
  actionId: z.string(),
});

/**
 * Retry a failed Microsoft integration action
 */
export const retryMicrosoftFailedAction = authorizedActionClient
  .metadata({
    name: "retry-microsoft-failed-action",
    permissions: Permissions.integration.manage,
    audit: {
      resourceType: "integration",
      action: "retry",
      category: "mutation",
    },
  })
  .schema(retryMicrosoftFailedActionSchema)
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
      organizationId,
    );

    if (!action) {
      throw ActionErrors.notFound("Action", "retry-microsoft-failed-action");
    }

    logger.info("Retrying failed Microsoft auto action", {
      userId: user.id,
      actionId: parsedInput.actionId,
    });

    return { success: true };
  });
