"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getOrganizationTags } from "../actions/get-organization-tags";

export function useOrganizationTags() {
  return useQuery({
    queryKey: queryKeys.organizationTags,
    queryFn: async () => {
      const result = await getOrganizationTags();
      if (result.serverError || !result.data) {
        throw new Error(
          result.serverError ?? "Failed to fetch organization tags",
        );
      }
      return result.data;
    },
  });
}
