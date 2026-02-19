"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateBotSessionProject } from "../actions/update-bot-session-project";

interface UseUpdateBotSessionProjectOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

export function useUpdateBotSessionProject(
  options?: UseUpdateBotSessionProjectOptions
) {
  const queryClient = useQueryClient();

  const { execute, isExecuting } = useAction(updateBotSessionProject, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Project updated", {
          description: `Recording will be saved to ${data.projectName}`,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.meetings.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.botSessions.all });
        options?.onSuccess?.();
      } else if (data !== undefined) {
        toast.error("Failed to update project", {
          description: "Please try again",
        });
        options?.onError?.();
      }
    },
    onError: ({ error }) => {
      toast.error("Failed to update project", {
        description: error.serverError || "Please try again",
      });
      options?.onError?.();
    },
  });

  return {
    updateProject: execute,
    isUpdating: isExecuting,
  };
}

