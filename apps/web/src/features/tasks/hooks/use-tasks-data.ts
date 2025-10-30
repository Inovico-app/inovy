"use client";

import { queryKeys } from "@/lib/query-keys";
import type { TaskWithContextDto } from "@/server/dto";
import { useQueries } from "@tanstack/react-query";
import { getUserProjects } from "../../projects/actions/get-user-projects";
import { getUserTasks } from "../actions/get-user-tasks";

interface UseTasksDataReturn {
  tasks: TaskWithContextDto[];
  projects: Array<{ id: string; name: string }>;
  isLoading: boolean;
}

export function useTasksData(): UseTasksDataReturn {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.tasks.userTasks(),
        queryFn: async () => {
          const result = await getUserTasks();
          if (!result.success || !result.data) {
            throw new Error(result.error ?? "Failed to load tasks");
          }
          return result.data;
        },
      },
      {
        queryKey: queryKeys.projects.userProjects(),
        queryFn: async () => {
          const result = await getUserProjects();
          if (!result.success || !result.data) {
            throw new Error(result.error ?? "Failed to load projects");
          }
          return result.data;
        },
      },
    ],
  });

  const [tasksQuery, projectsQuery] = results;

  return {
    tasks: tasksQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    isLoading: tasksQuery.isLoading || projectsQuery.isLoading,
  };
}

