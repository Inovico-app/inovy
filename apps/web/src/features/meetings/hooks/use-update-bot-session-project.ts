"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateBotSessionProject } from "../actions/update-bot-session-project";

interface UseUpdateBotSessionProjectOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useUpdateBotSessionProject(
  options?: UseUpdateBotSessionProjectOptions,
) {
  const t = useTranslations("meetings");
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(updateBotSessionProject, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(t("toast.projectUpdated"), {
          description: t("toast.projectUpdatedDescription", {
            projectName: data.projectName,
          }),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.botSessions.all });
        options?.onSuccess?.();
      } else if (data !== undefined) {
        toast.error(t("toast.projectUpdateFailed"), {
          description: t("toast.pleaseTryAgain"),
        });
        options?.onError?.();
      }
    },
    onError: ({ error }) => {
      toast.error(t("toast.projectUpdateFailed"), {
        description: error.serverError || t("toast.pleaseTryAgain"),
      });
      options?.onError?.();
    },
  });

  return {
    updateProject: execute,
    isUpdating: isExecuting,
  };
}
