"use client";

import { queryKeys } from "@/lib/query-keys";
import type { TaskStatus } from "@/server/db/schema/tasks";
import type { TaskWithContextDto } from "@/server/dto/task.dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateTaskStatus } from "../actions/update-task-status";

interface UseTaskOperationsReturn {
  handleStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  isUpdating: boolean;
}

export function useTaskOperations(): UseTaskOperationsReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
    }: {
      taskId: string;
      newStatus: TaskStatus;
    }) => {
      const result = await updateTaskStatus({ taskId, status: newStatus });
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update task status");
      }
      return { taskId, newStatus };
    },
    onMutate: async ({ taskId, newStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.tasks.userTasks(),
      });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData<TaskWithContextDto[]>(
        queryKeys.tasks.userTasks()
      );

      // Optimistically update cache
      queryClient.setQueryData<TaskWithContextDto[]>(
        queryKeys.tasks.userTasks(),
        (old) =>
          old?.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      return { previousTasks, taskId, newStatus };
    },
    onError: (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousTasks) {
        queryClient.setQueryData(
          queryKeys.tasks.userTasks(),
          context.previousTasks
        );
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to update task status"
      );
    },
    onSuccess: (data, variables, context) => {
      // Show success toast with undo action
      const statusLabel =
        data.newStatus === "completed"
          ? "completed"
          : data.newStatus === "in_progress"
          ? "in progress"
          : data.newStatus === "pending"
          ? "pending"
          : "cancelled";

      const currentTasks = queryClient.getQueryData<TaskWithContextDto[]>(
        queryKeys.tasks.userTasks()
      );
      const task = currentTasks?.find((t) => t.id === data.taskId);

      toast.success(`Task marked as ${statusLabel}`, {
        action: task
          ? {
              label: "Undo",
              onClick: () => {
                if (context?.previousTasks) {
                  const previousTask = context.previousTasks.find(
                    (t) => t.id === data.taskId
                  );
                  if (previousTask) {
                    // Trigger mutation to revert (fire and forget)
                    void updateTaskStatus({
                      taskId: data.taskId,
                      status: previousTask.status,
                    }).then((revertResult) => {
                      if (revertResult.success) {
                        queryClient.setQueryData(
                          queryKeys.tasks.userTasks(),
                          context.previousTasks
                        );
                        toast.success("Status change undone");
                      } else {
                        toast.error("Failed to undo status change");
                      }
                    });
                  }
                }
              },
            }
          : undefined,
        duration: 5000,
      });
    },
  });

  // React Compiler automatically memoizes this function
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    mutation.mutate({ taskId, newStatus });
  };

  return {
    handleStatusChange,
    isUpdating: mutation.isPending,
  };
}

