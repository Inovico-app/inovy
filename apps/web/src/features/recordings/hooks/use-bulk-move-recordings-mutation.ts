import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { moveRecordingAction } from "../actions/move-recording";

interface BulkMoveProgress {
  total: number;
  current: number;
  succeeded: number;
  failed: number;
}

interface BulkMoveResult {
  recordingId: string;
  recordingTitle: string;
  success: boolean;
  error?: string;
}

interface UseBulkMoveRecordingsMutationOptions {
  onSuccess?: (results: BulkMoveResult[]) => void;
  onProgress?: (progress: BulkMoveProgress) => void;
}

/**
 * Hook to handle bulk recording move mutation
 * Manages multiple server action calls, loading state, progress tracking, and success/error handling
 */
export function useBulkMoveRecordingsMutation(
  options?: UseBulkMoveRecordingsMutationOptions
) {
  const router = useRouter();
  const [isMoving, setIsMoving] = useState(false);
  const [progress, setProgress] = useState<BulkMoveProgress>({
    total: 0,
    current: 0,
    succeeded: 0,
    failed: 0,
  });

  const moveRecordings = async (
    recordings: Array<{ id: string; title: string }>,
    targetProjectId: string
  ) => {
    setIsMoving(true);

    const total = recordings.length;
    const results: BulkMoveResult[] = [];

    let succeeded = 0;
    let failed = 0;
    let completed = 0;
    // Initial progress
    const initialProgress = { total, current: 0, succeeded: 0, failed: 0 };
    setProgress(initialProgress);
    options?.onProgress?.(initialProgress);

    // Move recordings one by one using Promise.allSettled
    const movePromises = recordings.map(async (recording, index) => {
      try {
        const result = await moveRecordingAction({
          recordingId: recording.id,
          targetProjectId,
        });

        if (result?.serverError || result?.validationErrors) {
          let error = result.serverError || "Failed to move recording";

          if (!error && result.validationErrors) {
            const firstError = Object.values(result.validationErrors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              error = firstError[0];
            } else if (
              firstError &&
              typeof firstError === "object" &&
              "_errors" in firstError
            ) {
              error = firstError._errors?.[0] || "Failed to move recording";
            }
          }

          failed++;
          completed++;
          const currentProgress = {
            total,
            current: completed,
            succeeded,
            failed,
          };
          setProgress(currentProgress);
          options?.onProgress?.(currentProgress);

          return {
            recordingId: recording.id,
            recordingTitle: recording.title,
            success: false,
            error,
          };
        }

        succeeded++;
        completed++;
        const currentProgress = {
          total,
          current: completed,
          succeeded,
          failed,
        };
        setProgress(currentProgress);
        options?.onProgress?.(currentProgress);

        return {
          recordingId: recording.id,
          recordingTitle: recording.title,
          success: true,
        };
      } catch (error) {
        failed++;
        completed++;
        const currentProgress = {
          total,
          current: completed,
          succeeded,
          failed,
        };
        setProgress(currentProgress);
        options?.onProgress?.(currentProgress);

        return {
          recordingId: recording.id,
          recordingTitle: recording.title,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const settledResults = await Promise.allSettled(movePromises);

    // Extract results from settled promises
    settledResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          recordingId: "unknown",
          recordingTitle: "Unknown recording",
          success: false,
          error: result.reason?.message || "Failed to move recording",
        });
      }
    });

    setIsMoving(false);

    // Show summary toast
    if (succeeded === total) {
      toast.success(
        `Successfully moved ${succeeded} recording${succeeded > 1 ? "s" : ""}`
      );
    } else if (succeeded > 0) {
      toast.warning(
        `Moved ${succeeded} of ${total} recordings successfully. ${failed} failed.`
      );
    } else {
      toast.error(`Failed to move ${failed} recording${failed > 1 ? "s" : ""}`);
    }

    // Refresh the router to update the UI
    router.refresh();

    options?.onSuccess?.(results);

    return results;
  };

  return {
    moveRecordings,
    isMoving,
    progress,
  };
}

