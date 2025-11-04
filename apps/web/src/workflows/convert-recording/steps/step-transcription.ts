import { logger } from "@/lib/logger";
import { TranscriptionService } from "@/server/services/transcription.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";
import { MAX_RETRIES, RETRY_DELAYS } from "../types";

/**
 * Step 1: Transcribe audio using Deepgram
 *
 * This step takes the uploaded audio file and transcribes it using Deepgram Nova-3.
 * Includes automatic retry logic for transient failures.
 *
 * @param recordingId - The recording to transcribe
 * @param fileUrl - URL of the audio file in Vercel Blob
 * @param retryCount - Current retry attempt (for internal use)
 * @returns Result indicating success or failure
 */
export async function executeTranscriptionStep(
  recordingId: string,
  fileUrl: string,
  retryCount = 0
): Promise<WorkflowResult<void>> {
  "use step";

  try {
    logger.info("Workflow Step 1: Starting transcription", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      retryCount,
    });

    const result = await TranscriptionService.transcribeUploadedFile(
      recordingId,
      fileUrl
    );

    if (result.isErr()) {
      if (retryCount < MAX_RETRIES) {
        const delay =
          RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn("Transcription failed, retrying...", {
          component: "ConvertRecordingWorkflow",
          recordingId,
          retryCount: retryCount + 1,
          delayMs: delay,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeTranscriptionStep(recordingId, fileUrl, retryCount + 1);
      }

      return failure(result.error);
    }

    logger.info("Workflow Step 1: Transcription completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    return success(undefined);
  } catch (error) {
    logger.error("Workflow Step 1: Transcription error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    return failure(
      error instanceof Error ? error : new Error("Transcription failed")
    );
  }
}

