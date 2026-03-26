import { getUserProjectsAction } from "@/features/projects/actions/get-user-projects";
import { useQuery } from "@tanstack/react-query";

interface UseProjectsForMoveOptions {
  enabled: boolean;
  currentProjectId: string;
}

/**
 * Hook to fetch available projects for moving a recording
 * Filters out the current project from the list
 */
export function useProjectsForMove({
  enabled,
  currentProjectId,
}: UseProjectsForMoveOptions) {
  return useQuery({
    queryKey: ["projects-for-move", currentProjectId],
    queryFn: async () => {
      const result = await getUserProjectsAction();

      if (result?.serverError || !result?.data) {
        throw new Error(result?.serverError || "Failed to load projects");
      }

      // Filter out current project
      return result.data.filter((p) => p.id !== currentProjectId);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}
