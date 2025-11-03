import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateTaskMetadata } from "../actions/update-task-metadata";
import type { UpdateTaskMetadataInput } from "@/server/validation/tasks/update-task-metadata";

/**
 * React Query mutation hook for updating task metadata
 * Provides optimistic updates and cache invalidation
 */
export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskMetadataInput) => {
      const result = await updateTaskMetadata(input);
      
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      
      if (!result?.data) {
        throw new Error("Failed to update task");
      }
      
      return result.data;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.id] });
      queryClient.invalidateQueries({ queryKey: ["taskStats"] });
      
      toast.success("Taak bijgewerkt!");
    },
    onError: (error: Error) => {
      console.error("Error updating task:", error);
      toast.error(error.message || "Fout bij bijwerken van taak");
    },
  });
}

