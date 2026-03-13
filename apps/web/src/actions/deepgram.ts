"use server";

import { getTemporaryDeepgramToken } from "@/lib/deepgram";
import { logger } from "@/lib/logger";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";

export const getDeepgramClientTokenAction = authorizedActionClient
  .metadata({
    permissions: { deepgram: ["token"] },
    name: "get-deepgram-client-token",
  })
  .action(async ({ ctx }) => {
    const { user, organizationId } = ctx;

    if (!user || !organizationId) {
      throw ActionErrors.unauthenticated(
        "User or organization not found",
        "getDeepgramClientTokenAction"
      );
    }

    logger.info("Generating temporary Deepgram client token", {
      component: "getDeepgramClientTokenAction",
      action: "getDeepgramClientTokenAction",
      userId: user.id,
      organizationId,
    });

    const { result: tokenResult, error: tokenError } =
      await getTemporaryDeepgramToken();

    if (tokenError) {
      logger.error("Failed to generate temporary Deepgram token", {
        error: tokenError.message,
        component: "getDeepgramClientTokenAction",
      });

      throw ActionErrors.internal(
        "Failed to generate temporary Deepgram token",
        tokenError,
        "getDeepgramClientTokenAction"
      );
    }

    if (!tokenResult) {
      throw ActionErrors.internal(
        "Failed to generate temporary token. Make sure the API key is of scope Member or higher.",
        undefined,
        "getDeepgramClientTokenAction"
      );
    }

    return { data: { token: tokenResult.access_token, success: true } };
  });
