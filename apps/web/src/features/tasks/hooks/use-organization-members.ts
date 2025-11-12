"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getOrgMembers, type OrganizationMember } from "../actions/get-organization-members";

interface UseOrganizationMembersReturn {
  members: OrganizationMember[];
  isLoading: boolean;
  error: string | null;
}

export function useOrganizationMembers(): UseOrganizationMembersReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.organization.members("current"),
    queryFn: async () => {
      const result = await getOrgMembers();
      if (!result.data) {
        throw new Error(result.serverError ?? "Failed to fetch organization members");
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    members: data ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}

