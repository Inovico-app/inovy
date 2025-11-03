import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { restoreTranscriptionVersion } from "../actions/restore-transcription-version";

interface UseRestoreTranscriptionMutationOptions {
  onSuccess?: () => void;
}

export function useRestoreTranscriptionMutation(
  options?: UseRestoreTranscriptionMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      recordingId: string;
      versionNumber: number;
    }) => {
      const result = await restoreTranscriptionVersion(input);
      if (result.serverError || !result.data) {
        throw new Error(
          result.serverError ?? "Failed to restore transcription version"
        );
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate recording query to refresh transcription
      queryClient.invalidateQueries({
        queryKey: queryKeys.recordings.detail(variables.recordingId),
      });

      // Invalidate transcription history
      queryClient.invalidateQueries({
        queryKey: ["transcription-history", variables.recordingId],
      });

      toast.success("Transcriptie versie hersteld");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kon transcriptie versie niet herstellen"
      );
    },
  });
}

