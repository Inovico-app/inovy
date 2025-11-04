import { useEffect, useState } from "react";

export interface UserRole {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Client-side hook to check if user has admin role
 * This fetches from a client-accessible endpoint or checks session
 */
export function useUserRole(): UserRole {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      try {
        // Make a lightweight API call to check role
        const response = await fetch("/api/auth/role", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin ?? false);
        }
      } catch (error) {
        console.error("Failed to check user role", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, []);

  return { isAdmin, isLoading };
}

