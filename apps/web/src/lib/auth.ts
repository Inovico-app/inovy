import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type {
  KindeOrganization,
  KindeUser,
} from "@kinde-oss/kinde-auth-nextjs/types";
import { type Result, err, ok } from "neverthrow";
import { logger } from "./logger";

/**
 * Server-side authentication utilities with proper error handling
 */

export interface AuthUser {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  picture: string | null;
  organization_code?: string;
}

interface AuthSession {
  isAuthenticated: boolean;
  user: AuthUser | null;
  organization: KindeOrganization | null;
}

export async function getAuthSession(): Promise<Result<AuthSession, string>> {
  try {
    const { isAuthenticated, getUser, getOrganization } =
      getKindeServerSession();

    if (!isAuthenticated) {
      logger.auth.sessionCheck(false, { action: "getAuthSession" });
      return ok({
        isAuthenticated: false,
        user: null,
        organization: null,
      });
    }

    const [userResult, organizationResult] = await Promise.all([
      safeGetUser(getUser),
      safeGetOrganization(getOrganization),
    ]);

    if (userResult.isErr()) {
      logger.auth.error(
        "Failed to get user in getAuthSession",
        new Error(userResult.error)
      );
      return err("Failed to get user data");
    }

    if (organizationResult.isErr()) {
      logger.auth.error(
        "Failed to get organization",
        new Error(organizationResult.error),
        {
          userId: userResult.value.id,
        }
      );
      // Organization failure is not critical, continue without it
    }

    const user = userResult.value;
    const organization = organizationResult.isOk()
      ? organizationResult.value
      : null;

    logger.auth.sessionCheck(true, {
      userId: user.id,
      hasOrganization: !!organization,
      action: "getAuthSession",
    });

    // Extract org_code from KindeOrganization (different property name)
    const orgCode = organization ? (organization as unknown as Record<string, unknown>).org_code as string | undefined : undefined;

    return ok({
      isAuthenticated: true,
      user: {
        ...user,
        organization_code: orgCode,
      },
      organization,
    });
  } catch (error) {
    const errorMessage = "Critical error in getAuthSession";
    logger.auth.error(errorMessage, error as Error);
    return err(errorMessage);
  }
}

export async function getUserSession(): Promise<
  Result<AuthUser | null, string>
> {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();

    if (!isAuthenticated) {
      logger.auth.sessionCheck(false, { action: "getUserSession" });
      return ok(null);
    }

    const userResult = await safeGetUser(getUser);

    if (userResult.isErr()) {
      logger.auth.error(
        "Failed to get user in getUserSession",
        new Error(userResult.error)
      );
      return err("Failed to get user data");
    }

    const user = userResult.value;
    logger.auth.sessionCheck(true, {
      userId: user.id,
      action: "getUserSession",
    });

    return ok(user);
  } catch (error) {
    const errorMessage = "Critical error in getUserSession";
    logger.auth.error(errorMessage, error as Error);
    return err(errorMessage);
  }
}

/**
 * Safe wrapper for getUser() call
 */
async function safeGetUser(
  getUser: () => Promise<KindeUser | null>
): Promise<Result<AuthUser, string>> {
  try {
    const kindeUser = await getUser();

    if (!kindeUser) {
      return err("No user data returned from Kinde");
    }

    const user: AuthUser = {
      id: kindeUser.id,
      email: kindeUser.email || null,
      given_name: kindeUser.given_name || null,
      family_name: kindeUser.family_name || null,
      picture: kindeUser.picture || null,
    };

    return ok(user);
  } catch (error) {
    const errorMessage = `Failed to fetch user: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    return err(errorMessage);
  }
}

/**
 * Safe wrapper for getOrganization() call
 */
async function safeGetOrganization(
  getOrganization: () => Promise<KindeOrganization | null>
): Promise<Result<KindeOrganization | null, string>> {
  try {
    const organization = await getOrganization();
    return ok(organization);
  } catch (error) {
    const errorMessage = `Failed to fetch organization: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    return err(errorMessage);
  }
}

