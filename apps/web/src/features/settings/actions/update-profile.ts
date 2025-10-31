"use server";

import { z } from "zod";
import { getUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { KindeUserService } from "@/server/services";
import { updateProfileSchema, type UpdateProfileInput } from "@/server/validation/settings/update-profile";

/**
 * Server action to update user profile information
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate input
    const validatedData = updateProfileSchema.parse(input);

    // Get current user session
    const userResult = await getUserSession();

    if (userResult.isErr()) {
      logger.error("Failed to get user session in updateProfile", {
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

    // Update user via Kinde API
    logger.info("Updating user profile", {
      userId: user.id,
      given_name: validatedData.given_name,
      family_name: validatedData.family_name,
    });

    const updateResult = await KindeUserService.updateUser(user.id, {
      given_name: validatedData.given_name,
      family_name: validatedData.family_name,
    });

    if (updateResult.isErr()) {
      logger.error("Failed to update user profile", {
        userId: user.id,
        error: updateResult.error,
      });

      return {
        success: false,
        error: "Failed to update profile. Please try again.",
      };
    }

    logger.info("Successfully updated user profile", {
      userId: user.id,
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      logger.warn("Validation error in updateProfile", {
        field: firstIssue.path.join("."),
        message: firstIssue.message,
      });

      return {
        success: false,
        error: firstIssue.message,
      };
    }

    logger.error("Unexpected error in updateProfile", {}, error as Error);

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
