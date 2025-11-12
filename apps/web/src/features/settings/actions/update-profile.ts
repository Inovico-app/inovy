"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/server/validation/settings/update-profile";

/**
 * Server action to update user profile information
 */
export const updateProfile = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(updateProfileSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Update user via Kinde API
    logger.info("Updating user profile", {
      userId: user.id,
      given_name: parsedInput.given_name,
      family_name: parsedInput.family_name,
    });

    try {
      const Users = await AuthService.getUsers();
      await Users.updateUser({
        id: user.id,
        requestBody: {
          given_name: parsedInput.given_name,
          family_name: parsedInput.family_name,
        },
      });

      logger.info("Successfully updated user profile", {
        userId: user.id,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to update user profile", {
        userId: user.id,
        error,
      });

      throw ActionErrors.internal(
        "Failed to update profile. Please try again.",
        error as Error,
        "update-profile"
      );
    }
  });

