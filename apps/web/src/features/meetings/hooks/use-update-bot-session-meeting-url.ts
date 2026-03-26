"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateBotSessionMeetingUrl } from "../actions/update-bot-session-meeting-url";
import { queryKeys } from "@/lib/query-keys";

interface UseUpdateBotSessionMeetingUrlOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useUpdateBotSessionMeetingUrl(
  options?: UseUpdateBotSessionMeetingUrlOptions,
) {
  const t = useTranslations("meetings");
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(updateBotSessionMeetingUrl, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(t("toast.meetingUrlUpdated"));
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.botSessions.all });
        options?.onSuccess?.();
      } else if (data !== undefined) {
        toast.error(t("toast.meetingUrlUpdateFailed"), {
          description: t("toast.pleaseTryAgain"),
        });
        options?.onError?.();
      }
    },
    onError: ({ error }) => {
      toast.error(t("toast.meetingUrlUpdateFailed"), {
        description: error.serverError || t("toast.pleaseTryAgain"),
      });
      options?.onError?.();
    },
  });

  return {
    updateMeetingUrl: execute,
    isUpdating: isExecuting,
  };
}
