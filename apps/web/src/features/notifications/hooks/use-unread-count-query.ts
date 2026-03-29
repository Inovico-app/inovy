"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";

/**
 * React Query hook for polling unread notification count
 * Polls every 60 seconds when the window is focused (no background polling).
 * Data is considered stale after 30 seconds.
 */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await fetch("/api/notifications/unread-count");

      if (!response.ok) {
        throw new Error("Failed to fetch unread count");
      }

      const data = await response.json();
      return data.count as number;
    },
    refetchInterval: 60000, // Poll every 60 seconds
    refetchIntervalInBackground: false, // Only poll when window is focused
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
