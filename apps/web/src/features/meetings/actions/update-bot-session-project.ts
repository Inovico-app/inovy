"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { BotSessionsQueries } from "@/server/data-access/bot-sessions.queries";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { updateBotSessionProjectSchema } from "@/server/validation/meetings/update-bot-session-project.schema";

const EDITABLE_BOT_STATUSES = ["scheduled", "failed"] as const;

/**
 * Update bot session project assignment
 * Only allowed for scheduled or failed bot sessions
 */
export const updateBotSessionProject = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:create"),
    name: "update-bot-session-project",
  })
  .schema(updateBotSessionProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { sessionId, projectId } = parsedInput;

    const session = await BotSessionsQueries.findById(sessionId, organizationId);

    if (!session) {
      throw ActionErrors.notFound(
        "Bot session not found",
        "update-bot-session-project"
      );
    }

    if (session.userId !== user.id) {
      throw ActionErrors.forbidden(
        "You can only update your own bot sessions",
        undefined,
        "update-bot-session-project"
      );
    }

    if (!EDITABLE_BOT_STATUSES.includes(session.botStatus as (typeof EDITABLE_BOT_STATUSES)[number])) {
      throw ActionErrors.badRequest(
        `Cannot update project when bot status is ${session.botStatus}. Only scheduled or failed sessions can be updated.`,
        "update-bot-session-project"
      );
    }

    const project = await ProjectQueries.findById(projectId, organizationId);

    if (!project) {
      throw ActionErrors.notFound(
        "Project not found",
        "update-bot-session-project"
      );
    }

    if (project.status !== "active") {
      throw ActionErrors.badRequest(
        "Can only assign bot sessions to active projects",
        "update-bot-session-project"
      );
    }

    logger.info("Updating bot session project", {
      userId: user.id,
      organizationId,
      sessionId,
      projectId,
    });

    const updated = await BotSessionsQueries.update(
      sessionId,
      organizationId,
      { projectId }
    );

    if (!updated) {
      throw ActionErrors.internal(
        "Failed to update bot session",
        undefined,
        "update-bot-session-project"
      );
    }

    CacheInvalidation.invalidateBotSession(sessionId, organizationId);
    CacheInvalidation.invalidateBotSessions(organizationId);

    logger.info("Successfully updated bot session project", {
      userId: user.id,
      sessionId,
      projectId,
    });

    return {
      success: true,
      projectId,
      projectName: project.name,
    } as const;
  });
