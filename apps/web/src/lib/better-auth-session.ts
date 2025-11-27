import "server-only";

import { type Result, err, ok } from "neverthrow";
import { headers } from "next/headers";
import { cache } from "react";
import { betterAuthInstance } from "./better-auth-server";
import { logger } from "./logger";
import type { Role } from "./rbac";

/**
 * Better Auth session types
 */
export interface BetterAuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
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
  roles: Role[] | null;
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
 * Map Better Auth member role to application roles
 * Always assigns at least a default role to ensure authorization works downstream
 */
function mapMemberRoles(
  activeMember: {
    id: string;
    organizationId: string;
    role: string;
    userId: string;
  } | null,
  userId: string,
  actionContext: string
): Role[] {
  const roles: Role[] = [];

  if (activeMember) {
    const memberRole = activeMember.role?.toLowerCase();
    if (memberRole === "owner" || memberRole === "admin") {
      roles.push("admin");
    } else if (memberRole === "manager") {
      roles.push("manager");
    } else if (memberRole === "member") {
      roles.push("user");
    } else {
      // Unexpected or missing role - log warning and assign default role
      const rawRole = activeMember.role ?? "missing";
      logger.warn("Unexpected Better Auth member role encountered", {
        component: "better-auth-session",
        userId,
        organizationId: activeMember.organizationId,
        rawRole,
        action: actionContext,
      });
      // Assign default "user" role for unrecognized roles
      roles.push("user");
    }
  } else {
    // No active member - assign default role for authenticated users
    roles.push("user");
  }

  return roles;
}

/**
 * Fetch and build Better Auth session data
 * Shared logic for both cached and uncached versions
 */
async function fetchAndBuildSession(
  actionContext: string
): Promise<Result<BetterAuthSessionData, string>> {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      logger.auth.sessionCheck(false, { action: actionContext });
      return ok({
        isAuthenticated: false,
        user: null,
        organization: null,
        member: null,
        roles: null,
      });
    }

    // Get active organization and member
    const [organizationsResult, activeMemberResult] = await Promise.all([
      betterAuthInstance.api
        .listOrganizations({
          headers: await headers(),
        })
        .catch(() => null),
      betterAuthInstance.api
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
    const roles = mapMemberRoles(activeMember, session.user.id, actionContext);

    logger.auth.sessionCheck(true, {
      userId: session.user.id,
      hasOrganization: !!activeOrganization,
      action: actionContext,
    });

    return ok({
      isAuthenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
        emailVerified: session.user.emailVerified ?? false,
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
      roles: roles.length > 0 ? roles : ["user"], // Ensure roles is never empty for authenticated users
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

