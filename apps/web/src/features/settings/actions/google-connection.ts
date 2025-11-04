"use server";

import { getUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { revalidatePath } from "next/cache";

/**
 * Get Google connection status for current user
 */
export async function getGoogleConnectionStatus(): Promise<{
  success: boolean;
  data?: {
    connected: boolean;
    email?: string;
    scopes?: string[];
    expiresAt?: Date;
  };
  error?: string;
}> {
  try {
    // Get current user session
    const userResult = await getUserSession();

    if (userResult.isErr()) {
      logger.error("Failed to get user session in getGoogleConnectionStatus", {
        error: userResult.error,
      });
      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const user = userResult.value;
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Get connection status
    const statusResult = await GoogleOAuthService.getConnectionStatus(user.id);

    if (statusResult.isErr()) {
      logger.error("Failed to get Google connection status", {
        userId: user.id,
        error: statusResult.error,
      });
      return {
        success: false,
        error: "Failed to get connection status",
      };
    }

    return {
      success: true,
      data: statusResult.value,
    };
  } catch (error) {
    logger.error(
      "Unexpected error in getGoogleConnectionStatus",
      {},
      error as Error
    );

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Disconnect Google account
 */
export async function disconnectGoogleAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get current user session
    const userResult = await getUserSession();

    if (userResult.isErr()) {
      logger.error("Failed to get user session in disconnectGoogleAccount", {
        error: userResult.error,
      });
      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const user = userResult.value;
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    logger.info("Disconnecting Google account", { userId: user.id });

    // Disconnect OAuth connection
    const disconnectResult = await GoogleOAuthService.disconnect(user.id);

    if (disconnectResult.isErr()) {
      logger.error("Failed to disconnect Google account", {
        userId: user.id,
        error: disconnectResult.error,
      });

      return {
        success: false,
        error: "Failed to disconnect account. Please try again.",
      };
    }

    logger.info("Successfully disconnected Google account", {
      userId: user.id,
    });

    // Revalidate settings page
    revalidatePath("/settings");

    return {
      success: true,
    };
  } catch (error) {
    logger.error(
      "Unexpected error in disconnectGoogleAccount",
      {},
      error as Error
    );

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

