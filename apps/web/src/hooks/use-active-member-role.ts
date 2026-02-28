"use client";

import { authClient } from "@/lib/auth-client";
import type { RoleName } from "@/lib/auth/access-control";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

interface ActiveMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Map Better Auth member role to application roles
 * Matches the server-side mapping logic
 */
/**
 * Map Better Auth member role to application roles
 * Matches the server-side mapping logic in better-auth-session.ts
 */
function mapMemberRoleToAppRoles(
  activeMember: ActiveMember | null
): RoleName[] {
  const roles: RoleName[] = [];

  if (activeMember) {
    const memberRole = activeMember.role?.toLowerCase();
    if (memberRole === "owner" || memberRole === "admin") {
      roles.push("admin");
    } else if (memberRole === "superadmin") {
      // Superadmin is a special role in the organization member role enum
      roles.push("superadmin");
    } else if (memberRole === "manager") {
      roles.push("manager");
    } else if (memberRole === "member" || memberRole === "user") {
      roles.push("user");
    } else if (memberRole === "viewer") {
      roles.push("viewer");
    } else {
      // Default role for unrecognized roles
      roles.push("user");
    }
  } else {
    // No active member - assign default role for authenticated users
    roles.push("user");
  }

  return roles;
}

/**
 * Fetch active member from Better Auth API.
 * Shared by useActiveMemberRole and useOrganizationSwitcher to avoid duplicate API calls.
 */
export async function fetchActiveMemberRoleData(): Promise<{
  activeMember: ActiveMember | null;
  roles: RoleName[];
  isSuperAdmin: boolean;
  isAdmin: boolean;
}> {
  try {
    const result = await authClient.organization.getActiveMember();
    const activeMember = result?.data ?? null;

    if (!activeMember) {
      return {
        activeMember: null,
        roles: ["user"],
        isSuperAdmin: false,
        isAdmin: false,
      };
    }

    const roles = mapMemberRoleToAppRoles(activeMember);
    return {
      activeMember,
      roles,
      isSuperAdmin: roles.includes("superadmin"),
      isAdmin: roles.includes("admin") || roles.includes("superadmin"),
    };
  } catch {
    return {
      activeMember: null,
      roles: ["user"],
      isSuperAdmin: false,
      isAdmin: false,
    };
  }
}

/**
 * Client-side hook to fetch active user role using Better Auth API
 * Uses react-query for caching and state management
 *
 * @param enabled - Whether to enable the query (default: true)
 */
export function useActiveMemberRole(enabled = true) {
  return useQuery({
    queryKey: queryKeys.auth.activeMemberRole(),
    queryFn: fetchActiveMemberRoleData,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

