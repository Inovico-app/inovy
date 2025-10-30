"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../../../lib/query-keys";

interface ExtractTasksResponse {
  extraction: {
    totalExtracted: number;
  };
}

interface UseExtractTasksMutationOptions {
  recordingId: string;
  onSuccess?: () => void;
}

export function useExtractTasksMutation({
  recordingId,
  onSuccess,
}: UseExtractTasksMutationOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/extract-tasks/${recordingId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to extract tasks");
      }

      const data: ExtractTasksResponse = await response.json();
      return data;
    },
    onSuccess: (data) => {
      toast.success(`${data.extraction.totalExtracted} taken geëxtraheerd!`);
      
      // Invalidate task queries to refetch fresh data
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byRecording(recordingId),
      });
      
      // Also invalidate general task lists
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.lists(),
      });

      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error extracting tasks:", error);
      toast.error("Fout bij extraheren van taken");
    },
  });

  return {
    extractTasks: mutation.mutate,
    isExtracting: mutation.isPending,
    error: mutation.error,
  };
}

