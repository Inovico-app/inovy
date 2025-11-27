import { cache } from "react";
import { headers } from "next/headers";
import { betterAuthInstance } from "./better-auth";
import { type Result, err, ok } from "neverthrow";
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
 * Cached server-side session helper for Better Auth
 * Uses React cache() to deduplicate session requests within the same render
 *
 * @returns Result containing Better Auth session data
 */
export const getBetterAuthSession = cache(
  async (): Promise<Result<BetterAuthSessionData, string>> => {
    try {
      const session = await betterAuthInstance.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        logger.auth.sessionCheck(false, { action: "getBetterAuthSession" });
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
        betterAuthInstance.api.listOrganizations({
          headers: await headers(),
        }).catch(() => null),
        betterAuthInstance.api.getActiveMember({
          headers: await headers(),
        }).catch(() => null),
      ]);

      const organizations = organizationsResult ?? [];
      const activeMember = activeMemberResult ?? null;

      // Get active organization (first one for now, or use activeMember's org)
      let activeOrganization: BetterAuthOrganization | null = null;
      if (activeMember) {
        const org = organizations.find(
          (o: { id: string }) => o.id === activeMember.organizationId
        );
        if (org) {
          activeOrganization = {
            id: org.id,
            name: org.name,
            slug: org.slug ?? null,
          };
        }
      } else if (organizations.length > 0) {
        const org = organizations[0];
        activeOrganization = {
          id: org.id,
          name: org.name,
          slug: org.slug ?? null,
        };
      }

      // Map Better Auth member role to application roles
      const roles: Role[] = [];
      if (activeMember) {
        const memberRole = activeMember.role?.toLowerCase();
        if (memberRole === "owner" || memberRole === "admin") {
          roles.push("admin");
        } else if (memberRole === "manager") {
          roles.push("manager");
        } else if (memberRole === "member") {
          roles.push("user");
        }
      }

      logger.auth.sessionCheck(true, {
        userId: session.user.id,
        hasOrganization: !!activeOrganization,
        action: "getBetterAuthSession",
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
        roles: roles.length > 0 ? roles : null,
      });
    } catch (error) {
      const errorMessage = "Critical error in getBetterAuthSession";
      logger.auth.error(errorMessage, error as Error);
      return err(errorMessage);
    }
  }
);

/**
 * Get Better Auth session (non-cached version for use outside React components)
 * Use getBetterAuthSession() in React Server Components instead
 */
export async function getBetterAuthSessionUncached(): Promise<
  Result<BetterAuthSessionData, string>
> {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
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
      betterAuthInstance.api.listOrganizations({
        headers: await headers(),
      }).catch(() => null),
      betterAuthInstance.api.getActiveMember({
        headers: await headers(),
      }).catch(() => null),
    ]);

    const organizations = organizationsResult ?? [];
    const activeMember = activeMemberResult ?? null;

    let activeOrganization: BetterAuthOrganization | null = null;
    if (activeMember) {
      const org = organizations.find(
        (o: { id: string }) => o.id === activeMember.organizationId
      );
      if (org) {
        activeOrganization = {
          id: org.id,
          name: org.name,
          slug: org.slug ?? null,
        };
      }
    } else if (organizations.length > 0) {
      const org = organizations[0];
      activeOrganization = {
        id: org.id,
        name: org.name,
        slug: org.slug ?? null,
      };
    }

    const roles: Role[] = [];
    if (activeMember) {
      const memberRole = activeMember.role?.toLowerCase();
      if (memberRole === "owner" || memberRole === "admin") {
        roles.push("admin");
      } else if (memberRole === "manager") {
        roles.push("manager");
      } else if (memberRole === "member") {
        roles.push("user");
      }
    }

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
      roles: roles.length > 0 ? roles : null,
    });
  } catch (error) {
    const errorMessage = "Critical error in getBetterAuthSessionUncached";
    logger.auth.error(errorMessage, error as Error);
    return err(errorMessage);
  }
}
