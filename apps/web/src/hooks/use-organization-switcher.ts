"use client";

import { fetchActiveMemberRoleData } from "@/hooks/use-active-member-role";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
}

export interface OrganizationWithRole extends Organization {
  role: string;
}

interface OrganizationSwitcherState {
  organizations: OrganizationWithRole[];
  activeOrganization: Organization | null;
  activeMemberRole: string | null;
  isLoading: boolean;
  isSwitching: boolean;
}

interface OrganizationSwitcherActions {
  switchOrganization: (orgId: string) => Promise<void>;
}

type OrgFromApi = {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
  role?: string;
};

async function fetchOrganizations(): Promise<OrganizationWithRole[]> {
  const orgsResult = await authClient.organization.list({});
  const orgsList = orgsResult?.data ?? [];
  return Array.isArray(orgsList)
    ? orgsList.map((org: OrgFromApi) => ({
        id: org.id,
        name: org.name,
        slug: org.slug ?? null,
        logo: org.logo ?? null,
        role: org.role ?? "member",
      }))
    : [];
}

function toOrgWithRole(
  org: OrganizationWithRole,
  role: string
): OrganizationWithRole {
  return { ...org, role };
}

function resolveActiveOrgAndRoles(
  organizations: OrganizationWithRole[],
  activeMember: { organizationId: string; role: string } | null
): {
  organizations: OrganizationWithRole[];
  activeOrganization: Organization | null;
  activeMemberRole: string | null;
} {
  if (organizations.length === 0) {
    return {
      organizations: [],
      activeOrganization: null,
      activeMemberRole: null,
    };
  }

  const resolvedRole = activeMember?.role ?? "member";
  let activeOrg: Organization | null = null;
  let organizationsWithRoles = organizations;

  if (activeMember?.organizationId) {
    const matched = organizations.find(
      (o) => o.id === activeMember.organizationId
    );
    if (matched) {
      activeOrg = { ...matched };
      organizationsWithRoles = organizations.map((o) =>
        o.id === matched.id ? toOrgWithRole(o, resolvedRole) : o
      );
    }
  }

  if (!activeOrg && organizations.length > 0) {
    const first = organizations[0];
    activeOrg = { ...first };
    organizationsWithRoles = organizations.map((o, i) =>
      i === 0 ? toOrgWithRole(o, resolvedRole) : o
    );
  }

  return {
    organizations: organizationsWithRoles,
    activeOrganization: activeOrg,
    activeMemberRole: activeMember?.role ?? null,
  };
}

export function useOrganizationSwitcher(): {
  state: OrganizationSwitcherState;
  actions: OrganizationSwitcherActions;
} {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: activeMemberData } = useQuery({
    queryKey: queryKeys.auth.activeMemberRole(),
    queryFn: fetchActiveMemberRoleData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const { data: orgsData, isLoading: isOrgsLoading } = useQuery({
    queryKey: queryKeys.auth.userOrganizations(),
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const resolved =
    orgsData && activeMemberData
      ? resolveActiveOrgAndRoles(orgsData, activeMemberData.activeMember)
      : null;

  const organizations = resolved?.organizations ?? [];
  const activeOrganization = resolved?.activeOrganization ?? null;
  const activeMemberRole = resolved?.activeMemberRole ?? null;
  const isLoading = isOrgsLoading;

  const switchMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await authClient.organization.setActive({
        organizationId: orgId,
      });

      if (error) {
        throw new Error(error.message ?? "Failed to switch organization");
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.userOrganizations(),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.auth.activeMemberRole(),
      });
      router.refresh();
    },
  });

  return {
    state: {
      organizations,
      activeOrganization,
      activeMemberRole,
      isLoading,
      isSwitching: switchMutation.isPending,
    },
    actions: {
      switchOrganization: switchMutation.mutateAsync,
    },
  };
}

