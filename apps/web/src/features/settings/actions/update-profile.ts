"use server";

import { getAuthSession } from "@/lib/auth";
import { AuthService } from "@/lib/kinde-api";
import { logger } from "@/lib/logger";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/server/validation/settings/update-profile";
import { z } from "zod";

/**
 * Server action to update user profile information
 */
export async function updateProfile(input: UpdateProfileInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate input
    const validatedData = updateProfileSchema.parse(input);

    // Get current user session
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      logger.error("Failed to get user session in updateProfile", {
        error: sessionResult.isErr() ? sessionResult.error : "No user found",
      });
      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const user = sessionResult.value.user;

    // Update user via Kinde API
    logger.info("Updating user profile", {
      userId: user.id,
      given_name: validatedData.given_name,
      family_name: validatedData.family_name,
    });

    try {
      await AuthService.Users.updateUser({
        id: user.id,
        requestBody: {
          given_name: validatedData.given_name,
          family_name: validatedData.family_name,
        },
      });

      logger.info("Successfully updated user profile", {
        userId: user.id,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Failed to update user profile", {
        userId: user.id,
        error,
      });

      return {
        success: false,
        error: "Failed to update profile. Please try again.",
      };
    }
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

