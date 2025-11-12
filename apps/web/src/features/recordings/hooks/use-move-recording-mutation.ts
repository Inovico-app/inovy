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
      if (data?.success && data.recording) {
        const targetProjectId = data.recording.projectId;
        const recordingId = data.recording.id;
        
        toast.success("Recording moved successfully");
        
        // Redirect to the recording detail page in the new project
        router.push(`/projects/${targetProjectId}/recordings/${recordingId}`);
        
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

