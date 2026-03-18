"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { addNotetakerByUrl } from "../actions/add-notetaker-by-url";
import { queryKeys } from "@/lib/query-keys";

interface UseAddNotetakerByUrlOptions {
  onSuccess?: () => void;
}

export function useAddNotetakerByUrl(options?: UseAddNotetakerByUrlOptions) {
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(addNotetakerByUrl, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Notetaker added", {
          description:
            "The notetaker will join the meeting and start recording.",
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.botSessions.all,
        });
        options?.onSuccess?.();
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to add notetaker", {
        description: error.serverError || "Please check the URL and try again",
      });
    },
  });

  return { execute, isExecuting };
}
