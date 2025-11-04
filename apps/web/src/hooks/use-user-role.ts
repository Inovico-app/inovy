import { useQuery } from "@tanstack/react-query";

export interface UserRole {
  isAdmin: boolean;
  isLoading: boolean;
}

interface UserRoleResponse {
  isAdmin: boolean;
  isAuthenticated: boolean;
  roles?: string[];
}

/**
 * Fetch user role from API
 */
async function fetchUserRole(): Promise<UserRoleResponse> {
  const response = await fetch("/api/auth/role", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user role");
  }

  return response.json();
}

/**
 * Client-side hook to check if user has admin role
 * Uses react-query for caching and state management
 */
export function useUserRole(): UserRole {
  const { data, isLoading } = useQuery({
    queryKey: ["userRole"],
    queryFn: fetchUserRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    isAdmin: data?.isAdmin ?? false,
    isLoading,
  };
}

