"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../../../lib/query-keys";

interface SummaryContent {
  overview: string;
  topics: string[];
  decisions: string[];
  speakerContributions: {
    speaker: string;
    contributions: string[];
  }[];
  importantQuotes: {
    speaker: string;
    quote: string;
    startTime?: number;
  }[];
}

interface SummaryData {
  content: SummaryContent;
  confidence: number;
  status?: string;
}

interface GenerateSummaryResponse {
  summary: SummaryData;
}

interface UseGenerateSummaryMutationOptions {
  recordingId: string;
  onSuccess?: () => void;
}

export function useGenerateSummaryMutation({
  recordingId,
  onSuccess,
}: UseGenerateSummaryMutationOptions) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/summarize/${recordingId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data: GenerateSummaryResponse = await response.json();
      return data.summary;
    },
    onSuccess: (data) => {
      toast.success("Samenvatting gegenereerd!");

      // Update the cache with the new summary
      queryClient.setQueryData(queryKeys.summaries.detail(recordingId), data);

      // Invalidate to ensure fresh data
      void queryClient.invalidateQueries({
        queryKey: queryKeys.summaries.detail(recordingId),
      });

      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error generating summary:", error);
      toast.error("Fout bij genereren van samenvatting");
    },
  });

  return {
    generateSummary: mutation.mutate,
    isGenerating: mutation.isPending,
    summary: mutation.data,
    error: mutation.error,
  };
}

