import { useQuery } from "@tanstack/react-query";
import { getOrganizationUsers } from "../actions/get-organization-users";

/**
 * React Query hook for fetching organization users
 * Used for populating assignee dropdowns
 */
export function useOrganizationUsersQuery() {
  return useQuery({
    queryKey: ["organizationUsers"],
    queryFn: async () => {
      const result = await getOrganizationUsers({});
      
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      
      if (!result?.data) {
        return [];
      }
      
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

