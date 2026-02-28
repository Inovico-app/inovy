"use client";

import { authClient } from "@/lib/auth-client";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
}

interface OrganizationWithRole extends Organization {
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

const QUERY_KEY = ["userOrganizations"] as const;

async function fetchOrganizationsAndActiveMember(): Promise<{
  organizations: OrganizationWithRole[];
  activeOrganization: Organization | null;
  activeMemberRole: string | null;
}> {
  const [orgsResult, activeMemberResult] = await Promise.all([
    authClient.organization.list({}),
    authClient.organization.getActiveMember({}),
  ]);

  const orgsList = orgsResult?.data ?? [];
  type OrgFromApi = {
    id: string;
    name: string;
    slug?: string | null;
    logo?: string | null;
    role?: string;
  };
  const organizations: OrganizationWithRole[] = Array.isArray(orgsList)
    ? orgsList.map((org: OrgFromApi) => ({
        id: org.id,
        name: org.name,
        slug: org.slug ?? null,
        logo: org.logo ?? null,
        role: org.role ?? "member",
      }))
    : [];

  const activeMember = activeMemberResult?.data ?? null;
  const activeMemberRole = activeMember?.role ?? null;

  if (organizations.length === 0) {
    return {
      organizations: [],
      activeOrganization: null,
      activeMemberRole: null,
    };
  }

  let activeOrg: Organization | null = null;
  if (activeMember?.organizationId) {
    const matched = organizations.find((o) => o.id === activeMember.organizationId);
    if (matched) {
      activeOrg = {
        id: matched.id,
        name: matched.name,
        slug: matched.slug,
        logo: matched.logo,
      };
      matched.role = activeMemberRole ?? "member";
    }
  }

  if (!activeOrg && organizations.length > 0) {
    activeOrg = {
      id: organizations[0].id,
      name: organizations[0].name,
      slug: organizations[0].slug,
      logo: organizations[0].logo,
    };
    organizations[0].role = activeMemberRole ?? "member";
  }

  return {
    organizations,
    activeOrganization: activeOrg,
    activeMemberRole,
  };
}

export function useOrganizationSwitcher(): {
  state: OrganizationSwitcherState;
  actions: OrganizationSwitcherActions;
} {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchOrganizationsAndActiveMember,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const switchMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await authClient.organization.setActive({
        organizationId: orgId,
      });

      if (error) {
        throw new Error(error.message ?? "Failed to switch organization");
      }

      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["activeMemberRole"] });
      router.refresh();
    },
  });

  const organizations = data?.organizations ?? [];
  const activeOrganization = data?.activeOrganization ?? null;
  const activeMemberRole = data?.activeMemberRole ?? null;

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
