"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getCachedBotSessionDetails } from "@/server/cache/bot-sessions.cache";
import { z } from "zod";

const getBotSessionDetailsSchema = z.object({
  sessionId: z.string().uuid(),
});

/**
 * Get bot session details with recording metadata
 * Used when opening the session details modal from meetings or bot sessions page
 */
export const getBotSessionDetails = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:read") })
  .schema(getBotSessionDetailsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { sessionId } = parsedInput;

    logger.info("Fetching bot session details", {
      organizationId,
      sessionId,
    });

    const session = await getCachedBotSessionDetails(sessionId, organizationId);

    if (!session) {
      throw ActionErrors.notFound("Bot session not found");
    }

    return session;
  });
