"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  updateSummary,
  type UpdateSummaryInput,
} from "../actions/update-summary";

interface UseUpdateSummaryMutationOptions {
  onSuccess?: () => void;
}

export function useUpdateSummaryMutation(
  options?: UseUpdateSummaryMutationOptions,
) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: UpdateSummaryInput) => {
      const result = await updateSummary(input);
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to update summary");
      }
      return result.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate summary detail (has a real useQuery consumer)
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaries.detail(variables.recordingId),
      });

      // Refresh RSC data — recording detail is server-rendered, not RQ
      router.refresh();

      toast.success("Summary updated successfully");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update summary",
      );
    },
  });
}
