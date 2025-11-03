"use client";

import { useQuery } from "@tanstack/react-query";
import { getSummaryHistory } from "../actions/get-summary-history";

export function useSummaryHistory(recordingId: string) {
  return useQuery({
    queryKey: ["summary-history", recordingId],
    queryFn: async () => {
      const result = await getSummaryHistory({ recordingId });
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to fetch summary history");
      }
      return result.data;
    },
    enabled: !!recordingId,
  });
}

