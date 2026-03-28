import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { restoreTranscriptionVersion } from "../actions/restore-transcription-version";

interface UseRestoreTranscriptionMutationOptions {
  onSuccess?: () => void;
}

export function useRestoreTranscriptionMutation(
  options?: UseRestoreTranscriptionMutationOptions,
) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (input: {
      recordingId: string;
      versionNumber: number;
    }) => {
      const result = await restoreTranscriptionVersion(input);
      if (result.serverError || !result.data) {
        throw new Error(
          result.serverError ?? "Failed to restore transcription version",
        );
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

      toast.success("Transcriptie versie hersteld");
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kon transcriptie versie niet herstellen",
      );
    },
  });
}
