import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTranscription } from "../actions/update-transcription";
import type { UpdateTranscriptionInput } from "@/server/validation/recordings/update-transcription";

interface UseUpdateTranscriptionMutationOptions {
  onSuccess?: () => void;
}

export function useUpdateTranscriptionMutation(
  options?: UseUpdateTranscriptionMutationOptions,
) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: UpdateTranscriptionInput) => {
      const result = await updateTranscription(input);
      if (result.serverError || !result.data) {
        throw new Error(result.serverError ?? "Failed to update transcription");
      }
      return result.data;
    },
    onSuccess: (_data, variables) => {
      // Invalidate transcription history (has a real useQuery consumer)
      queryClient.invalidateQueries({
        queryKey: ["transcription-history", variables.recordingId],
      });

      // Refresh RSC data — recording detail is server-rendered, not RQ
      router.refresh();

      toast.success("Transcriptie succesvol bijgewerkt");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kon transcriptie niet bijwerken",
      );
    },
  });
}
