"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateMeetingDetails } from "../actions/update-meeting-details";

interface UseUpdateMeetingDetailsOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useUpdateMeetingDetails(
  options?: UseUpdateMeetingDetailsOptions,
) {
  const t = useTranslations("meetings");
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(updateMeetingDetails, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(t("toast.meetingUpdatedSuccessfully"));
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.botSessions.all });
        options?.onSuccess?.();
      } else if (data !== undefined) {
        toast.error(t("toast.meetingDetailUpdateFailed"), {
          description: t("toast.pleaseTryAgain"),
        });
        options?.onError?.();
      }
    },
    onError: ({ error }) => {
      toast.error(t("toast.meetingDetailUpdateFailed"), {
        description: error.serverError || t("toast.pleaseTryAgain"),
      });
      options?.onError?.();
    },
  });

  return {
    updateMeetingDetails: execute,
    isUpdating: isExecuting,
  };
}
