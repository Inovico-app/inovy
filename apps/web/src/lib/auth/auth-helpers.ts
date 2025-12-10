import { err, ok, type Result } from "neverthrow";
import type { BetterAuthUser } from "../auth";
import {
  getBetterAuthSession,
  type BetterAuthOrganization,
} from "../better-auth-session";
import { logger } from "../logger";

interface AuthSession {
  isAuthenticated: boolean;
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
}

/**
 * Get authentication session using Better Auth
 * Uses React cache() for deduplication within the same render
 *
 * @deprecated Use getBetterAuthSession() directly from @/lib/better-auth-session instead.
 * This wrapper loses the member field and adds unnecessary indirection.
 * This function will be removed in a future version.
 *
 * @returns Result containing session data
 */
export async function getAuthSession(): Promise<Result<AuthSession, string>> {
  try {
    const betterAuthResult = await getBetterAuthSession();

    if (betterAuthResult.isErr()) {
      return err(betterAuthResult.error);
    }

    const { user, isAuthenticated, organization } = betterAuthResult.value;

    if (!isAuthenticated || !user) {
      logger.auth.sessionCheck(false, { action: "getAuthSession" });
      return ok({
        isAuthenticated: false,
        user: null,
        organization: null,
      });
    }

    logger.auth.sessionCheck(true, {
      userId: user.id,
      organization,
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

