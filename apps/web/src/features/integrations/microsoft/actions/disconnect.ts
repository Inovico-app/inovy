"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { MicrosoftOAuthService } from "@/server/services/microsoft-oauth.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Disconnect Microsoft account
 */
export const disconnectMicrosoftAccount = authorizedActionClient
  .metadata({
    name: "disconnect-microsoft-account",
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

    logger.info("Disconnecting Microsoft account", { userId: user.id });

    const disconnectResult = await MicrosoftOAuthService.disconnect(user.id);

    if (disconnectResult.isErr()) {
      logger.error("Failed to disconnect Microsoft account", {
        userId: user.id,
        error: disconnectResult.error,
      });

      throw ActionErrors.internal(
        "Failed to disconnect account. Please try again.",
        disconnectResult.error,
        "disconnect-microsoft-account",
      );
    }

    logger.info("Successfully disconnected Microsoft account", {
      userId: user.id,
    });

    revalidatePath("/settings");

    return { success: true };
  });
