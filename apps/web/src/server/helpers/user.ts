import { err, ok, type Result } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { type AuthUser } from "../../lib/auth";
import { AuthService } from "../../lib/kinde-api";
import { logger } from "../../lib/logger";
import type { KindeUserDto } from "../dto";

/**
 * Ensure user exists in Kinde (create if needed on first signup)
 * Since we're using Kinde as source of truth, this mainly validates the user exists
 */
export async function ensureUserExistsInKinde(
  authUser: AuthUser,
  orgCode: string
): Promise<Result<KindeUserDto, ActionError>> {
  try {
    // Try to fetch user from Kinde
    const response = await AuthService.Users.getUserData({ id: authUser.id });

    if (response) {
      const user: KindeUserDto = {
        id: response.id || authUser.id,
        email: response.preferred_email || null,
        given_name: response.first_name || null,
        family_name: response.last_name || null,
        picture: response.picture || null,
        is_suspended: response.is_suspended,
        created_on: response.created_on || undefined,
        last_signed_in: response.last_signed_in || undefined,
      };
      return ok(user);
    }

    // If user doesn't exist in Kinde, create them (for new signups)
    // This should rarely happen as Kinde typically creates users during auth flow
    logger.info("Creating new user in Kinde for first signup", {
      kindeUserId: authUser.id,
      email: authUser.email,
    });

    const createResponse = await AuthService.Users.createUser({
      requestBody: {
        profile: {
          given_name: authUser.given_name || undefined,
          family_name: authUser.family_name || undefined,
        },
        identities: [
          {
            type: "email",
            details: {
              email: authUser.email || "",
            },
          },
        ],
        organization_code: orgCode,
      },
    });

    if (!createResponse?.id) {
      logger.error("Failed to create user in Kinde - no ID returned", {
        kindeUserId: authUser.id,
      });
      return err(
        ActionErrors.internal(
          "Failed to create user in Kinde",
          undefined,
          "ensureUserExistsInKinde"
        )
      );
    }

    const createdUser: KindeUserDto = {
      id: createResponse.id,
      email: authUser.email || null,
      given_name: authUser.given_name || null,
      family_name: authUser.family_name || null,
      picture: null,
    };

    logger.info("Successfully created user in Kinde", {
      userId: createdUser.id,
      email: createdUser.email,
    });

    return ok(createdUser);
  } catch (error) {
    logger.error(
      "Unexpected error in ensureUserExistsInKinde",
      { kindeUserId: authUser.id },
      error as Error
    );
    return err(
      ActionErrors.internal(
        "Failed to ensure user exists",
        error as Error,
        "ensureUserExistsInKinde"
      )
    );
  }
}

