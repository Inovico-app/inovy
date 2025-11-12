"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Get Google connection status for current user
 */
export const getGoogleConnectionStatus = authorizedActionClient
  .metadata({ policy: "settings:read" })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Get connection status
    const statusResult = await GoogleOAuthService.getConnectionStatus(user.id);

    if (statusResult.isErr()) {
      logger.error("Failed to get Google connection status", {
        userId: user.id,
        error: statusResult.error,
      });
      throw ActionErrors.internal(
        "Failed to get connection status",
        statusResult.error,
        "get-google-connection-status"
      );
    }

    return statusResult.value;
  });

/**
 * Disconnect Google account
 */
export const disconnectGoogleAccount = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    logger.info("Disconnecting Google account", { userId: user.id });

    // Disconnect OAuth connection
    const disconnectResult = await GoogleOAuthService.disconnect(user.id);

    if (disconnectResult.isErr()) {
      logger.error("Failed to disconnect Google account", {
        userId: user.id,
        error: disconnectResult.error,
      });

      throw ActionErrors.internal(
        "Failed to disconnect account. Please try again.",
        disconnectResult.error,
        "disconnect-google-account"
      );
    }

    logger.info("Successfully disconnected Google account", {
      userId: user.id,
    });

    // Revalidate settings page
    revalidatePath("/settings");

    return { success: true };
  });
