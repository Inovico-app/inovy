"use client";

import { queryKeys } from "@/lib/query-keys";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserProjects } from "../actions/get-user-projects";

const LAST_USED_PROJECT_KEY = "inovy:last-used-project-id";

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

  // Determine default project: last-used > single project > first project
  let lastUsedProjectId: string | null = null;
  if (typeof window !== "undefined") {
    try {
      lastUsedProjectId = localStorage.getItem(LAST_USED_PROJECT_KEY);
    } catch {
      // localStorage may be unavailable in restricted environments
    }
  }

  const defaultProjectId =
    projects.find((p) => p.id === lastUsedProjectId)?.id ??
    (projects.length > 0 ? projects[0].id : undefined);

  const setLastUsedProjectId = useCallback((projectId: string) => {
    try {
      localStorage.setItem(LAST_USED_PROJECT_KEY, projectId);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return {
    projects,
    isLoadingProjects,
    defaultProjectId,
    hasOnlyOneProject: projects.length === 1,
    setLastUsedProjectId,
  };
}
