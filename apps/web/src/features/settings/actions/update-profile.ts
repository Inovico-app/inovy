"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { UserService } from "@/server/services/user.service";
import { updateProfileSchema } from "@/server/validation/settings/update-profile";

/**
 * Server action to update user profile information
 */
export const updateProfile = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:update") })
  .schema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    logger.info("Updating user profile", {
      userId: user.id,
      given_name: parsedInput.given_name,
      family_name: parsedInput.family_name,
    });

    const result = await UserService.updateUser(user.id, {
      given_name: parsedInput.given_name,
      family_name: parsedInput.family_name,
    });

    if (result.isErr()) {
      logger.error("Failed to update user profile", {
        userId: user.id,
        error: result.error,
      });

      throw ActionErrors.internal(
        "Failed to update profile. Please try again.",
        result.error,
        "update-profile"
      );
    }

    logger.info("Successfully updated user profile", {
      userId: user.id,
    });

    return { success: true };
  });

