"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateSummary, type UpdateSummaryInput } from "../actions/update-summary";

interface UseUpdateSummaryMutationOptions {
  onSuccess?: () => void;
}

export function useUpdateSummaryMutation(
  options?: UseUpdateSummaryMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSummaryInput) => {
      const result = await updateSummary(input);
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to update summary");
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries (cache invalidation happens in server action)
      queryClient.invalidateQueries({
        queryKey: ["recording", variables.recordingId],
      });
      queryClient.invalidateQueries({
        queryKey: ["summary", variables.recordingId],
      });

      toast.success("Summary updated successfully");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update summary"
      );
    },
  });
}

