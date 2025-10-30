import { Result, err, ok } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { type AuthUser } from "../../lib/auth";
import { logger } from "../../lib/logger";
import type { KindeUserDto } from "../dto";
import { KindeUserService } from "../services/kinde-user.service";

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
    const userResult = await KindeUserService.getUserById(authUser.id);

    if (userResult.isErr()) {
      logger.error("Failed to get user from Kinde", {
        kindeUserId: authUser.id,
        error: userResult.error,
      });
      return err(
        ActionErrors.internal(
          "Failed to fetch user from Kinde",
          undefined,
          "ensureUserExistsInKinde"
        )
      );
    }

    // If user exists in Kinde, return it
    if (userResult.value) {
      return ok(userResult.value);
    }

    // If user doesn't exist in Kinde, create them (for new signups)
    // This should rarely happen as Kinde typically creates users during auth flow
    logger.info("Creating new user in Kinde for first signup", {
      kindeUserId: authUser.id,
      email: authUser.email,
    });

    const createResult = await KindeUserService.createUser({
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
      organization_codes: [orgCode],
    });

    if (createResult.isErr()) {
      logger.error("Failed to create user in Kinde", {
        kindeUserId: authUser.id,
        error: createResult.error,
      });
      return err(
        ActionErrors.internal(
          "Failed to create user in Kinde",
          undefined,
          "ensureUserExistsInKinde"
        )
      );
    }

    return ok(createResult.value);
  } catch (error) {
    logger.error(
      "Unexpected error in ensureUserExistsInKinde",
      { kindeUserId: authUser.id },
      error as Error
    );
    return err(
      ActionErrors.internal(
        "Failed to ensure user exists",
        undefined,
        "ensureUserExistsInKinde"
      )
    );
  }
}

