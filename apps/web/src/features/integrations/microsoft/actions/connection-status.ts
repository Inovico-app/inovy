"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { MicrosoftOAuthService } from "@/server/services/microsoft-oauth.service";
import { z } from "zod";

/**
 * Get Microsoft connection status for current user
 */
export const getMicrosoftConnectionStatus = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:read") })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const statusResult = await MicrosoftOAuthService.getConnectionStatus(
      user.id,
    );

    if (statusResult.isErr()) {
      logger.error("Failed to get Microsoft connection status", {
        userId: user.id,
        error: statusResult.error,
      });
      throw ActionErrors.internal(
        "Failed to get connection status",
        statusResult.error,
        "get-microsoft-connection-status",
      );
    }

    return statusResult.value;
  });
