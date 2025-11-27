import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type {
  KindeOrganization,
  KindeUser,
} from "@kinde-oss/kinde-auth-nextjs/types";
import { type Result, err, ok } from "neverthrow";
import { logger } from "./logger";
import type { Role } from "./rbac";
import {
  getBetterAuthSession,
  type BetterAuthSessionData,
} from "./better-auth-session";

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
  roles?: Role[] | null;
}

interface AuthSession {
  isAuthenticated: boolean;
  user: AuthUser | null;
  organization: KindeOrganization | null;
}

/**
 * Get authentication session using Better Auth
 * This is the new implementation that will replace Kinde
 * Uses React cache() for deduplication within the same render
 *
 * @returns Result containing session data compatible with existing AuthSession interface
 */
export async function getAuthSession(): Promise<Result<AuthSession, string>> {
  try {
    const betterAuthResult = await getBetterAuthSession();

    if (betterAuthResult.isErr()) {
      return err(betterAuthResult.error);
    }

    const betterAuth = betterAuthResult.value;

    if (!betterAuth.isAuthenticated || !betterAuth.user) {
      logger.auth.sessionCheck(false, { action: "getAuthSession" });
      return ok({
        isAuthenticated: false,
        user: null,
        organization: null,
      });
    }

    // Map Better Auth session to AuthSession interface for backward compatibility
    const user: AuthUser = {
      id: betterAuth.user.id,
      email: betterAuth.user.email ?? null,
      given_name: betterAuth.user.name?.split(" ")[0] ?? null,
      family_name:
        betterAuth.user.name?.split(" ").slice(1).join(" ") ?? null,
      picture: betterAuth.user.image ?? null,
      organization_code: betterAuth.organization?.id ?? undefined,
      roles: betterAuth.roles,
    };

    // Map Better Auth organization to KindeOrganization-like structure
    const organization: KindeOrganization | null = betterAuth.organization
      ? {
          orgCode: betterAuth.organization.id,
          name: betterAuth.organization.name,
          // Add other KindeOrganization fields as needed
        } as KindeOrganization
      : null;

    logger.auth.sessionCheck(true, {
      userId: user.id,
      hasOrganization: !!organization,
      action: "getAuthSession",
    });

    return ok({
      isAuthenticated: true,
      user,
      organization,
    });
  } catch (error) {
    const errorMessage = "Critical error in getAuthSession";
    logger.auth.error(errorMessage, error as Error);
    return err(errorMessage);
  }
}

/**
 * Legacy Kinde-based getAuthSession (kept for reference during migration)
 * TODO: Remove in Phase 7 (INO-238)
 */
async function getAuthSessionKinde(): Promise<Result<AuthSession, string>> {
  try {
    const { isAuthenticated, getUser, getOrganization, getRoles } =
      getKindeServerSession();

    if (!isAuthenticated) {
      logger.auth.sessionCheck(false, { action: "getAuthSessionKinde" });
      return ok({
        isAuthenticated: false,
        user: null,
        organization: null,
      });
    }

    const [userResult, organizationResult, roles] = await Promise.all([
      safeGetUser(getUser),
      safeGetOrganization(getOrganization),
      getRoles(),
    ]);

    if (userResult.isErr()) {
      logger.warn("Failed to get user in getAuthSessionKinde", {
        component: "auth",
        error: userResult.error,
        action: "getAuthSessionKinde",
      });
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
    }

    const user = userResult.value;
    const organization = organizationResult.isOk()
      ? organizationResult.value
      : null;

    logger.auth.sessionCheck(true, {
      userId: user.id,
      hasOrganization: !!organization,
      action: "getAuthSessionKinde",
    });

    return ok({
      isAuthenticated: true,
      user: {
        ...user,
        organization_code: organization?.orgCode ?? undefined,
        roles: roles?.map((role) => role.name as Role) ?? null,
      },
      organization,
    });
  } catch (error) {
    const errorMessage = "Critical error in getAuthSessionKinde";
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
      email: kindeUser.email ?? null,
      given_name: kindeUser.given_name ?? null,
      family_name: kindeUser.family_name ?? null,
      picture: kindeUser.picture ?? null,
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

