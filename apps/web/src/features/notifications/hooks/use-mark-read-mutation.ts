"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { markNotificationReadAction } from "../actions/mark-notification-read";

/**
 * React Query mutation for marking a notification as read
 * Invalidates notification queries on success
 */
export function useMarkReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await markNotificationReadAction({ notificationId });

      if (response?.serverError) {
        throw new Error(response.serverError);
      }

      return response?.data;
    },
    onSuccess: () => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mark notification as read",
      );
    },
  });
}
