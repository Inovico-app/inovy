"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateBotSessionMeetingUrl } from "../actions/update-bot-session-meeting-url";
import { queryKeys } from "@/lib/query-keys";

interface UseUpdateBotSessionMeetingUrlOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useUpdateBotSessionMeetingUrl(
  options?: UseUpdateBotSessionMeetingUrlOptions
) {
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(updateBotSessionMeetingUrl, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Meeting URL updated");
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.botSessions.all });
        options?.onSuccess?.();
      } else if (data !== undefined) {
        toast.error("Failed to update meeting URL", {
          description: "Please try again",
        });
        options?.onError?.();
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to update meeting URL", {
        description: error.serverError || "Please try again",
      });
      options?.onError?.();
    },
  });

  return {
    updateMeetingUrl: execute,
    isUpdating: isExecuting,
  };
}
