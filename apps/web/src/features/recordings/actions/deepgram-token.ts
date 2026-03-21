"use server";

import { getTemporaryDeepgramToken } from "@/lib/deepgram";
import { logger } from "@/lib/logger";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";

export const getDeepgramTokenAction = authorizedActionClient
  .metadata({
    permissions: { deepgram: ["token"] },
    name: "get-deepgram-token",
    audit: {
      resourceType: "recording",
      action: "get",
      category: "read",
    },
  })
  .action(async ({ ctx }) => {
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User or organization not found",
        "getDeepgramTokenAction",
      );
    }

    logger.info("Generating temporary Deepgram client token for recording", {
      component: "getDeepgramTokenAction",
      action: "getDeepgramTokenAction",
      userId: user.id,
      organizationId,
    });

    const { result: tokenResult, error: tokenError } =
      await getTemporaryDeepgramToken();

    if (tokenError) {
      logger.error("Failed to generate temporary Deepgram token", {
        error: tokenError.message,
        component: "getDeepgramTokenAction",
      });

      throw ActionErrors.internal(
        "Failed to generate temporary Deepgram token",
        tokenError,
        "getDeepgramTokenAction",
      );
    }

    if (!tokenResult) {
      throw ActionErrors.internal(
        "Failed to generate temporary token. Make sure the API key is of scope Member or higher.",
        undefined,
        "getDeepgramTokenAction",
      );
    }

    return { data: { token: tokenResult.access_token, success: true } };
  });
