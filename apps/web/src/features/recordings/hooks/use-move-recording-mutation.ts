import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { moveRecordingAction } from "../actions/move-recording";

interface UseMoveRecordingMutationOptions {
  onSuccess?: () => void;
}

/**
 * Hook to handle recording move mutation
 * Manages the server action call, loading state, and success/error handling
 */
export function useMoveRecordingMutation(
  options?: UseMoveRecordingMutationOptions
) {
  const router = useRouter();

  const { execute, isExecuting } = useAction(moveRecordingAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Recording moved successfully");
        router.refresh();
        options?.onSuccess?.();
      }
    },
    onError: (error) => {
      console.error("Move recording error:", error);
      toast.error(
        error.error.serverError ?? "Failed to move recording. Please try again."
      );
    },
  });

  return {
    moveRecording: execute,
    isMoving: isExecuting,
  };
}

