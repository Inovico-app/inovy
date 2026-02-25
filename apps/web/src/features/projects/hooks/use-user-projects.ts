"use client";

import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { getUserProjects } from "../actions/get-user-projects";

interface UseUserProjectsOptions {
  enabled?: boolean;
}

export function useUserProjects({
  enabled = true,
}: UseUserProjectsOptions = {}) {
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: queryKeys.projects.userProjects(),
    queryFn: async () => {
      const result = await getUserProjects();
      if (!result.success || !result.data) return [];
      return result.data;
    },
    enabled,
  });

  const defaultProjectId = projects.length > 0 ? projects[0].id : undefined;

  return { projects, isLoadingProjects, defaultProjectId };
}

