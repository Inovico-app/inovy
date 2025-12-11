"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getTemporaryDeepgramToken } from "@/lib/deepgram";
import { logger } from "@/lib/logger";
import { publicActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";

export const getDeepgramClientTokenAction = publicActionClient
  .metadata({
    permissions: {},
    name: "get-deepgram-client-token",
  })
  .action(async () => {
    const authResult = await getBetterAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.user ||
      !authResult.value.organization
    ) {
      throw ActionErrors.unauthenticated(
        "User or organization not found",
        "getDeepgramClientTokenAction"
      );
    }

    const { user, organization } = authResult.value;
    logger.info("Generating temporary Deepgram client token", {
      component: "getDeepgramClientTokenAction",
      action: "getDeepgramClientTokenAction",
      userId: user.id,
      organizationId: organization.id,
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

