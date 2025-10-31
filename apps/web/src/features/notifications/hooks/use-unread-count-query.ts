"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

/**
 * React Query hook for polling unread notification count
 * Polls every 15 seconds in the background
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
    refetchInterval: 15000, // Poll every 15 seconds
    refetchIntervalInBackground: true, // Continue polling when window is not focused
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}

