"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { markAllNotificationsRead } from "../actions/mark-all-read";

/**
 * React Query mutation for marking all notifications as read
 * Invalidates notification queries on success
 */
export function useMarkAllReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await markAllNotificationsRead();

      if (!response.success || !response.data) {
        throw new Error(response.error ?? "Failed to mark all notifications as read");
      }

      return response.data.count;
    },
    onSuccess: (count) => {
      // Invalidate all notification queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });

      toast.success(`${count} ${count === 1 ? "notificatie" : "notificaties"} gemarkeerd als gelezen`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to mark all notifications as read"
      );
    },
  });
}

