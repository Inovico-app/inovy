import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { updateTranscription } from "../actions/update-transcription";
import type { UpdateTranscriptionInput } from "@/server/validation/recordings/update-transcription";

interface UseUpdateTranscriptionMutationOptions {
  onSuccess?: () => void;
}

export function useUpdateTranscriptionMutation(
  options?: UseUpdateTranscriptionMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTranscriptionInput) => {
      const result = await updateTranscription(input);
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to update transcription");
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

      toast.success("Transcriptie succesvol bijgewerkt");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kon transcriptie niet bijwerken"
      );
    },
  });
}

