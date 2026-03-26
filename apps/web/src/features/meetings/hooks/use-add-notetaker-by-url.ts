"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { addNotetakerByUrl } from "../actions/add-notetaker-by-url";
import { queryKeys } from "@/lib/query-keys";

interface UseAddNotetakerByUrlOptions {
  onSuccess?: () => void;
}

export function useAddNotetakerByUrl(options?: UseAddNotetakerByUrlOptions) {
  const t = useTranslations("meetings");
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(addNotetakerByUrl, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(t("toast.notetakerAddedByUrl"), {
          description: t("toast.notetakerAddedByUrlDescription"),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.botSessions.all,
        });
        options?.onSuccess?.();
      }
    },
    onError: ({ error }) => {
      toast.error(t("toast.notetakerAddByUrlFailed"), {
        description:
          error.serverError || t("toast.notetakerAddByUrlFailedDescription"),
      });
    },
  });

  return { execute, isExecuting };
}
