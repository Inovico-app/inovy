import "server-only";

import { err, ok } from "neverthrow";

import type { BetterAuthUser } from "@/lib/auth";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";

/**
 * Resolved, validated auth identity for a single request.
 * Passed explicitly into service methods — never fetched inside them.
 *
 * All fields are guaranteed non-optional. The caller (action middleware or
 * resolveAuthContext) has already validated them before constructing this.
 */
export interface AuthContext {
  readonly user: BetterAuthUser;
  readonly organizationId: string;
  readonly userTeamIds: string[];
}

/**
 * Resolve auth context from the current request.
 *
 * Use this ONLY in callers that sit outside authorizedActionClient middleware:
 * - Plain "use server" functions
 * - API route handlers
 *
 * authorizedActionClient actions already have ctx.user / ctx.organizationId /
 * ctx.userTeamIds — construct AuthContext directly from those instead.
 */
export async function resolveAuthContext(
  callerContext?: string,
): Promise<ActionResult<AuthContext>> {
  const sessionResult = await getBetterAuthSession();

  if (sessionResult.isErr()) {
    return err(
      ActionErrors.internal(
        "Failed to resolve authentication session",
        new Error(sessionResult.error),
        callerContext ?? "resolveAuthContext",
      ),
    );
  }

  const { user, organization, userTeamIds } = sessionResult.value;

  if (!user) {
    return err(
      ActionErrors.unauthenticated(
        "No authenticated user in session",
        callerContext ?? "resolveAuthContext",
      ),
    );
  }

  if (!organization) {
    return err(
      ActionErrors.forbidden(
        "No active organization in session",
        undefined,
        callerContext ?? "resolveAuthContext",
      ),
    );
  }

  return ok({
    user,
    organizationId: organization.id,
    userTeamIds: userTeamIds ?? [],
  } satisfies AuthContext);
}
