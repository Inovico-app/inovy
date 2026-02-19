"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateMeetingDetails } from "../actions/update-meeting-details";

interface UseUpdateMeetingDetailsOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useUpdateMeetingDetails(
  options?: UseUpdateMeetingDetailsOptions
) {
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(updateMeetingDetails, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Meeting updated successfully");
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.botSessions.all });
        options?.onSuccess?.();
      } else if (data !== undefined) {
        toast.error("Failed to update meeting", {
          description: (data as { message?: string }).message || "Please try again",
        });
        options?.onError?.();
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to update meeting", {
        description: error.serverError || "Please try again",
      });
    },
  });

  return {
    updateMeetingDetails: execute,
    isUpdating: isExecuting,
  };
}

