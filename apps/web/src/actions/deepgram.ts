"use server";

import { logger } from "@/lib";
import { publicActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { getTemporaryDeepgramToken } from "@/lib/deepgram";

export const getDeepgramClientTokenAction = publicActionClient.action(
  async () => {
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
  }
);

