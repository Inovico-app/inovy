import { useQuery } from "@tanstack/react-query";
import { getTranscriptionHistory } from "../actions/get-transcription-history";

export function useTranscriptionHistory(recordingId: string) {
  return useQuery({
    queryKey: ["transcription-history", recordingId],
    queryFn: async () => {
      const result = await getTranscriptionHistory({ recordingId });
      if (result.serverError || !result.data) {
        throw new Error(
          result.serverError ?? "Failed to fetch transcription history"
        );
      }
      return result.data;
    },
    enabled: !!recordingId,
  });
}

