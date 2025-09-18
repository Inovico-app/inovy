import { Result, err, ok } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { getAuthSession, type AuthUser } from "../../lib/auth";
import { logger } from "../../lib/logger";
import { OrganizationQueries, UserQueries } from "../data-access";
import type { UserDto } from "../dto";

/**
 * Check if user exists in database and if not, create them
 */
export async function findExistingUserByKindeId(
  authUser: AuthUser
): Promise<Result<UserDto | null, ActionError>> {
  try {
    // Safely attempt to find existing user
    const existingUser = await UserQueries.findByKindeIdWithOrganization(
      authUser.id
    ).catch((error) => {
      logger.error(
        "Failed to query user by Kinde ID",
        { kindeUserId: authUser.id },
        error as Error
      );
      // throw error;
    });

    if (existingUser) {
      return ok({
        id: existingUser.id,
        givenName: existingUser.givenName,
        familyName: existingUser.familyName,
        picture: existingUser.picture,
        kindeId: existingUser.kindeId,
        email: existingUser.email,
        organizationId: existingUser.organizationId,
      });
    }

    // fetch user and organization details from Kinde so we can create the user in the database
    const kindeUser = await getAuthSession();
    if (kindeUser.isErr()) {
      return err(
        ActionErrors.internal(
          "Failed to get Kinde details for user",
          undefined,
          "findExistingUserByKindeId"
        )
      );
    }

    const { organization: newOrganization, user: newUser } = kindeUser.value;

    if (!newOrganization) {
      return err(
        ActionErrors.internal(
          "Failed to get Kinde organization details for user",
          undefined,
          "findExistingUserByKindeId"
        )
      );
    }

    if (!newUser) {
      return err(
        ActionErrors.internal(
          "Failed to get Kinde user details for user",
          undefined,
          "findExistingUserByKindeId"
        )
      );
    }

    // Find or create the organization in our database
    let dbOrganization = await OrganizationQueries.findByKindeId(
      newOrganization.orgCode
    ).catch((error) => {
      logger.error(
        "Failed to query organization by Kinde ID",
        { kindeOrgId: newOrganization.orgCode },
        error as Error
      );
      // throw error;
    });

    // If organization doesn't exist, create it
    if (!dbOrganization) {
      // Create a unique slug from the organization code
      const baseSlug = newOrganization.orgCode
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");

      try {
        dbOrganization = await OrganizationQueries.create({
          kindeId: newOrganization.orgCode,
          name:
            newOrganization.orgName ??
            `Organization ${newOrganization.orgCode}`,
          slug: baseSlug,
        });
      } catch (error) {
        // If it's a unique constraint error, try to find the existing organization
        // This can happen in race conditions where multiple requests try to create the same org
        logger.warn(
          "Failed to create organization, attempting to find existing one",
          {
            kindeOrgId: newOrganization.orgCode,
            error: (error as Error).message,
          }
        );

        // Try to find the organization that was likely created by another request
        dbOrganization = await OrganizationQueries.findByKindeId(
          newOrganization.orgCode
        );

        if (!dbOrganization) {
          logger.error(
            "Failed to create organization and couldn't find existing one",
            {
              kindeOrgId: newOrganization.orgCode,
            },
            error as Error
          );
          throw error;
        }
      }
    }

    // Safely attempt to create user in the database with the correct organization UUID
    const createUserResult = await UserQueries.create({
      kindeId: newUser.id,
      email: newUser.email || "",
      givenName: newUser.given_name,
      familyName: newUser.family_name,
      picture: newUser.picture,
      organizationId: dbOrganization.id, // Use the database UUID, not Kinde orgCode
    }).catch((error) => {
      logger.error(
        "Failed to create user in database",
        {
          kindeUserId: newUser.id,
          organizationId: dbOrganization!.id,
        },
        error as Error
      );
      throw error;
    });

    return ok(createUserResult);
  } catch (error) {
    const errorMessage = "Failed to find or create user in database";
    logger.error(
      errorMessage,
      {
        kindeUserId: authUser.id,
      },
      error as Error
    );
    return err(
      ActionErrors.internal(errorMessage, error, "findExistingUserByKindeId")
    );
  }
}

