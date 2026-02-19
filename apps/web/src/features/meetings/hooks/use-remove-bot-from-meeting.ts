"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { removeBotFromMeeting } from "../actions/remove-bot-from-meeting";
import { queryKeys } from "@/lib/query-keys";
import type { RemoveBotFromMeetingInput } from "@/server/validation/meetings/remove-bot-from-meeting.schema";

export type { RemoveBotFromMeetingInput };

interface UseRemoveBotFromMeetingOptions {
  onSuccess?: () => void;
}

/**
 * Hook for removing a bot from a meeting
 * Supports both calendarEventId (meetings UI) and sessionId (bot sessions page)
 * Invalidates bot sessions cache on success (client-side React Query)
 */
export function useRemoveBotFromMeeting(
  options?: UseRemoveBotFromMeetingOptions
) {
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(removeBotFromMeeting, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Bot removed from meeting", {
          description: "The bot will not join this meeting.",
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.botSessions.all,
        });
        options?.onSuccess?.();
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to remove bot", {
        description: error.serverError || "Please try again",
      });
    },
  });

  return {
    execute: (input: RemoveBotFromMeetingInput) => execute(input),
    isExecuting,
  };
}
