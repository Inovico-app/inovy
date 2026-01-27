import { updateUtteranceSpeaker } from "@/features/recordings/actions/update-utterance-speaker";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

interface UseUpdateUtteranceSpeakerOptions {
  onSuccess?: () => void;
}

export function useUpdateUtteranceSpeaker(
  options?: UseUpdateUtteranceSpeakerOptions
) {
  const { execute, isExecuting } = useAction(updateUtteranceSpeaker, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Spreker voor deze zin is bijgewerkt");
        options?.onSuccess?.();
      } else {
        const errorMessage =
          data?.error || "Fout bij bijwerken van spreker";
        toast.error(errorMessage);
      }
    },
    onError: ({ error }) => {
      const errorMessage =
        error.serverError || "Fout bij bijwerken van spreker";
      toast.error(errorMessage);
    },
  });

  return {
    updateUtteranceSpeaker: execute,
    isUpdating: isExecuting,
  };
}
