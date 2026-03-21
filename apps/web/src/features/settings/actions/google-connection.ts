"use server";

import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Get Google connection status for current user
 */
export const getGoogleConnectionStatus = authorizedActionClient
  .metadata({
    name: "get-google-connection-status",
    permissions: policyToPermissions("settings:read"),
    audit: { resourceType: "integration", action: "get", category: "read" },
  })
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
        "get-google-connection-status",
      );
    }

    return statusResult.value;
  });

/**
 * Disconnect Google account
 */
export const disconnectGoogleAccount = authorizedActionClient
  .metadata({
    name: "disconnect-google-account",
    permissions: policyToPermissions("settings:update"),
    audit: {
      resourceType: "integration",
      action: "disconnect",
      category: "mutation",
    },
  })
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
        "disconnect-google-account",
      );
    }

    logger.info("Successfully disconnected Google account", {
      userId: user.id,
    });

    // Invalidate cached Google connection status and revalidate settings page
    CacheInvalidation.invalidateGoogleConnection(user.id);
    revalidatePath("/settings");

    return { success: true };
  });
