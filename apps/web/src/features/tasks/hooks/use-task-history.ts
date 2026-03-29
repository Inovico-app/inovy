"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getTaskHistory } from "../actions/get-task-history";

export function useTaskHistory(taskId: string) {
  return useQuery({
    queryKey: queryKeys.taskHistory(taskId),
    queryFn: async () => {
      const result = await getTaskHistory({ taskId });
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to fetch task history");
      }
      return result.data;
    },
    enabled: !!taskId,
  });
}
