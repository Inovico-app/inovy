"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { updateTaskMetadata } from "../actions/update-task-metadata";
import type { UpdateTaskMetadataInput } from "@/server/validation/tasks/update-task-metadata";
import type { TaskDto } from "@/server/dto";

interface UseUpdateTaskMetadataMutationOptions {
  onSuccess?: (data: TaskDto) => void;
}

export function useUpdateTaskMetadataMutation(
  options?: UseUpdateTaskMetadataMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskMetadataInput) => {
      const result = await updateTaskMetadata(input);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? "Failed to update task");
      }
      return result.data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.all,
      });

      // Snapshot previous values
      const previousUserTasks = queryClient.getQueryData(
        queryKeys.tasks.userTasks()
      );

      // Optimistically update cache
      queryClient.setQueryData(
        queryKeys.tasks.userTasks(),
        (old: TaskDto[] | undefined) =>
          old?.map((task) =>
            task.id === variables.taskId
              ? {
                  ...task,
                  title: variables.title,
                  description: variables.description ?? task.description,
                  priority: variables.priority,
                  status: variables.status,
                  assigneeId: variables.assigneeId ?? task.assigneeId,
                  dueDate: variables.dueDate
                    ? new Date(variables.dueDate)
                    : task.dueDate,
                  isManuallyEdited: true,
                  lastEditedAt: new Date(),
                }
              : task
          )
      );

      return { previousUserTasks };
    },
    onError: (error, _variables, context) => {
      // Revert optimistic update on error
      if (context?.previousUserTasks) {
        queryClient.setQueryData(
          queryKeys.tasks.userTasks(),
          context.previousUserTasks
        );
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
      });

      toast.success("Task updated successfully");

      // Call custom success callback if provided
      options?.onSuccess?.(data);
    },
  });
}

