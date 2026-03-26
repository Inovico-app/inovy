"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { removeBotFromMeeting } from "../actions/remove-bot-from-meeting";
import { queryKeys } from "@/lib/query-keys";
import type { RemoveBotFromMeetingInput } from "@/server/validation/meetings/remove-bot-from-meeting.schema";

export type { RemoveBotFromMeetingInput };

interface UseRemoveBotFromMeetingOptions {
  onSuccess?: () => void;
}

/**
 * Hook for removing a notetaker from a meeting
 * Supports both calendarEventId (meetings UI) and sessionId (bot sessions page)
 * Invalidates notetaker sessions cache on success (client-side React Query)
 */
export function useRemoveBotFromMeeting(
  options?: UseRemoveBotFromMeetingOptions,
) {
  const t = useTranslations("meetings");
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(removeBotFromMeeting, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(t("toast.notetakerRemoved"), {
          description: t("toast.notetakerRemovedDescription"),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.botSessions.all,
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.meetings.all,
        });
        options?.onSuccess?.();
      }
    },
    onError: ({ error }) => {
      toast.error(t("toast.notetakerRemoveFailed"), {
        description: error.serverError || t("toast.pleaseTryAgain"),
      });
    },
  });

  return {
    execute: (input: RemoveBotFromMeetingInput) => execute(input),
    isExecuting,
  };
}
