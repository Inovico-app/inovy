import { type Result, err, ok } from "neverthrow";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { logger } from "./logger";

/**
 * Better Auth session types
 */
export interface BetterAuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetterAuthOrganization {
  id: string;
  name: string;
  slug: string | null;
}

export interface BetterAuthMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
}

export interface BetterAuthSessionData {
  isAuthenticated: boolean;
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  member: BetterAuthMember | null;
}

/**
 * Resolve active organization from organizations list and active member
 */
function resolveActiveOrganization(
  organizations: Array<{ id: string; name: string; slug: string | null }>,
  activeMember: {
    id: string;
    organizationId: string;
    role: string;
    userId: string;
  } | null
): BetterAuthOrganization | null {
  if (activeMember) {
    const org = organizations.find((o) => o.id === activeMember.organizationId);
    if (org) {
      return {
        id: org.id,
        name: org.name,
        slug: org.slug ?? null,
      };
    }
  }

  if (organizations.length > 0) {
    const org = organizations[0];
    return {
      id: org.id,
      name: org.name,
      slug: org.slug ?? null,
    };
  }

  return null;
}

/**
 * Fetch and build Better Auth session data
 * Shared logic for both cached and uncached versions
 */
async function fetchAndBuildSession(
  actionContext: string
): Promise<Result<BetterAuthSessionData, string>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      logger.auth.sessionCheck(false, { action: actionContext });
      return ok({
        isAuthenticated: false,
        user: null,
        organization: null,
        member: null,
      });
    }

    // Get active organization and member
    const [organizationsResult, activeMemberResult] = await Promise.all([
      auth.api
        .listOrganizations({
          headers: await headers(),
        })
        .catch(() => null),
      auth.api
        .getActiveMember({
          headers: await headers(),
        })
        .catch(() => null),
    ]);

    const organizations = organizationsResult ?? [];
    const activeMember = activeMemberResult ?? null;

    const activeOrganization = resolveActiveOrganization(
      organizations,
      activeMember
    );

    logger.auth.sessionCheck(true, {
      userId: session.user.id,
      hasOrganization: !!activeOrganization,
      action: actionContext,
    });

    return ok({
      isAuthenticated: true,
      user: {
        ...session.user,
        // Ensure name is not null (use email or "User" as fallback)
        name: session.user.name ?? session.user.email ?? "User",
        // Add createdAt and updatedAt from session or use defaults
        // Better Auth session doesn't include these, so we use session timestamp
        createdAt: session.user.createdAt ?? new Date(0),
        updatedAt: session.user.updatedAt ?? new Date(),
      },
      organization: activeOrganization,
      member: activeMember
        ? {
            id: activeMember.id,
            userId: activeMember.userId,
            organizationId: activeMember.organizationId,
            role: activeMember.role,
          }
        : null,
    });
  } catch (error) {
    const errorMessage = `Critical error in ${actionContext}`;
    logger.auth.error(errorMessage, error as Error);
    return err(errorMessage);
  }
}

/**
 * Cached server-side session helper for Better Auth
 * Uses React cache() to deduplicate session requests within the same render
 * Note: This caches per-request, not across users - each user's session is isolated
 *
 * @returns Result containing Better Auth session data
 */
export const getBetterAuthSession = cache(
  async (): Promise<Result<BetterAuthSessionData, string>> => {
    return fetchAndBuildSession("getBetterAuthSession");
  }
);

/**
 * Get Better Auth session (non-cached version for use outside React components)
 * Use getBetterAuthSession() in React Server Components instead
 */
export async function getBetterAuthSessionUncached(): Promise<
  Result<BetterAuthSessionData, string>
> {
  return fetchAndBuildSession("getBetterAuthSessionUncached");
}

