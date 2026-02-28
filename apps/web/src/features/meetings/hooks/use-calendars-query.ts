"use client";

import { useQuery } from "@tanstack/react-query";
import { getCalendars } from "../actions/get-calendars";

export interface Calendar {
  id: string;
  summary: string;
  accessRole: string;
}

/**
 * React Query hook for fetching Google calendars
 * Used for populating calendar selection dropdowns
 */
export function useCalendarsQuery(enabled = true) {
  return useQuery({
    queryKey: ["calendars"],
    queryFn: async () => {
      const result = await getCalendars();

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      if (!result?.data) {
        return [] as Calendar[];
      }

      // Ensure we return an array
      if (!Array.isArray(result.data)) {
        return [] as Calendar[];
      }

      return result.data as Calendar[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled,
  });
}
