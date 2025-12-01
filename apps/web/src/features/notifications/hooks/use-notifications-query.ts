"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../actions/get-notifications";
import type { NotificationFilters, NotificationListResponse } from "../types";

/**
 * React Query hook for fetching notifications list
 * Can be initialized with server-side data
 */
export function useNotificationsQuery(
  filters?: NotificationFilters,
  initialData?: NotificationListResponse,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.notifications.list(filters as Record<string, unknown>),
    queryFn: async () => {
      const response = await getNotifications(filters);

      if (!response.success || !response.data) {
        throw new Error(response.error ?? "Failed to fetch notifications");
      }

      return response.data;
    },
    initialData,
    staleTime: 30000, // 30 seconds
    enabled,
  });
}

