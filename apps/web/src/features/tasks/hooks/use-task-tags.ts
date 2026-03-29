"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getTaskTags } from "../actions/get-task-tags";

export function useTaskTags(taskId: string) {
  return useQuery({
    queryKey: queryKeys.taskTags(taskId),
    queryFn: async () => {
      const result = await getTaskTags({ taskId });
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to fetch task tags");
      }
      return result.data;
    },
    enabled: !!taskId,
  });
}
