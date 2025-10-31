"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { markNotificationRead } from "../actions/mark-notification-read";

/**
 * React Query mutation for marking a notification as read
 * Invalidates notification queries on success
 */
export function useMarkReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await markNotificationRead({ notificationId });

      if (!response.success) {
        throw new Error(response.error ?? "Failed to mark notification as read");
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark notification as read"
      );
    },
  });
}

