import "server-only";

import { err, ok, type Result } from "neverthrow";
import { getBetterAuthSession, type BetterAuthOrganization } from "./better-auth-session";
import { logger } from "./logger";
import type { Role } from "./rbac";

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
  organization: BetterAuthOrganization | null;
}

/**
 * Get authentication session using Better Auth
 * Uses React cache() for deduplication within the same render
 *
 * @returns Result containing session data
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

    // Map Better Auth session to AuthSession interface
    const user: AuthUser = {
      id: betterAuth.user.id,
      email: betterAuth.user.email ?? null,
      given_name: betterAuth.user.name?.split(" ")[0] ?? null,
      family_name: betterAuth.user.name?.split(" ").slice(1).join(" ") ?? null,
      picture: betterAuth.user.image ?? null,
      organization_code: betterAuth.organization?.id ?? undefined,
      roles: betterAuth.roles,
    };

    logger.auth.sessionCheck(true, {
      userId: user.id,
      hasOrganization: !!betterAuth.organization,
      action: "getAuthSession",
    });

    return ok({
      isAuthenticated: true,
      user,
      organization: betterAuth.organization,
    });
  } catch (error) {
    const errorMessage = "Critical error in getAuthSession";
    logger.auth.error(errorMessage, error as Error);
    return err(errorMessage);
  }
}

