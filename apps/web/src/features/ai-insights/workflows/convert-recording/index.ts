import { logger } from "@/lib/logger";
import { err, ok, type Result } from "neverthrow";
import { getAiInsightsStep } from "./step-ai-insights";
import { executeFinalStep } from "./step-finalize";
import { getRecordingStep } from "./step-get-recording";
import { sendSuccessNotification } from "./step-send-notification";
import { executeSummaryStep } from "./step-summary";
import { executeTaskExtractionStep } from "./step-tasks";
import { executeTranscriptionStep } from "./step-transcription";
import { validateParallelResults } from "./step-validate-parallel-results";
import type { WorkflowResult } from "./types";
import { updateWorkflowStatus } from "./update-status";

/**
 * Main Workflow: Convert Recording Into AI Insights
 *
 * This workflow orchestrates the complete AI processing pipeline:
 * 1. Transcribe audio using Deepgram
 * 2. Generate summary and extract tasks in parallel using OpenAI
 * 3. Invalidate caches and trigger notifications
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Workflow status tracking in database
 * - Error handling with detailed logging
 * - Cache invalidation
 * - Parallel execution where possible
 *
 * @param recordingId - The recording to process
 * @param isReprocessing - Whether this is a reprocessing operation (skips transcription if already exists)
 * @returns WorkflowResult with completion status
 */
export async function convertRecordingIntoAiInsights(
  recordingId: string,
  isReprocessing = false
): Promise<Result<WorkflowResult, Error>> {
  "use workflow";

  const startTime = Date.now();

  try {
    logger.info("Workflow: Starting AI insights conversion", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      isReprocessing,
    });

    // Update workflow status to running
    await updateWorkflowStatus(recordingId, "running", undefined, 0);

    const recordingResult = await getRecordingStep(recordingId);

    if (recordingResult.isErr() || !recordingResult.value) {
      const errorMsg = "Recording not found";
      await updateWorkflowStatus(recordingId, "failed", errorMsg);
      return err(new Error(errorMsg));
    }

    const recording = recordingResult.value;

    // Step 1: Transcribe audio (skip if reprocessing and transcription exists)
    let transcriptionText = recording.transcriptionText;

    if (!isReprocessing || !transcriptionText) {
      const transcriptionResult = await executeTranscriptionStep(
        recordingId,
        recording.fileUrl
      );

      if (transcriptionResult.isErr()) {
        const errorMsg = `Transcription failed: ${transcriptionResult.error.message}`;
        await updateWorkflowStatus(recordingId, "failed", errorMsg);
        return err(transcriptionResult.error);
      }

      // Get transcription data for subsequent steps
      const updatedRecording = await getRecordingStep(recordingId);

      if (
        updatedRecording.isErr() ||
        !updatedRecording.value?.transcriptionText
      ) {
        const errorMsg = "Transcription text not available";
        await updateWorkflowStatus(recordingId, "failed", errorMsg);
        return err(new Error(errorMsg));
      }

      transcriptionText = updatedRecording.value.transcriptionText;
    } else {
      logger.info("Workflow: Skipping transcription (reprocessing)", {
        component: "ConvertRecordingWorkflow",
        recordingId,
      });
    }

    if (!transcriptionText) {
      const errorMsg = "Transcription text not available";
      await updateWorkflowStatus(recordingId, "failed", errorMsg);
      return err(new Error(errorMsg));
    }

    // Get utterances for context
    const transcriptionInsight = await getAiInsightsStep(recordingId);

    const utterances =
      transcriptionInsight.isOk() && transcriptionInsight.value
        ? transcriptionInsight.value.utterances ?? undefined
        : undefined;

    // Step 2: Run summary and task extraction in parallel
    logger.info("Workflow Step 2: Starting parallel processing", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    const [summaryResult, taskExtractionResult] = await Promise.allSettled([
      executeSummaryStep(recordingId, transcriptionText, utterances),
      executeTaskExtractionStep(
        recordingId,
        recording.projectId,
        transcriptionText,
        recording.organizationId,
        recording.createdById,
        utterances
      ),
    ]);

    // Validate parallel processing results
    const validationResult = await validateParallelResults(
      recordingId,
      summaryResult,
      taskExtractionResult
    );

    if (validationResult.isErr()) {
      // logs are sent in the validateParallelResults step
      return err(validationResult.error);
    }

    const tasksExtracted =
      taskExtractionResult.status === "fulfilled" &&
      taskExtractionResult.value.isOk()
        ? taskExtractionResult.value.value
        : 0;

    // Step 3: Finalize
    await executeFinalStep(
      recordingId,
      recording.projectId,
      recording.organizationId
    );

    // Update workflow status to completed
    await updateWorkflowStatus(recordingId, "completed", undefined);

    const duration = Date.now() - startTime;
    logger.info("Workflow: Completed successfully", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      durationMs: duration,
      tasksExtracted,
    });

    // Send final success notification
    await sendSuccessNotification({
      recordingId,
      recordingTitle: recording.title,
      projectId: recording.projectId,
      userId: recording.createdById,
      organizationId: recording.organizationId,
      tasksExtracted,
      durationMs: duration,
      isReprocessing,
    });

    return ok({
      recordingId,
      transcriptionCompleted: true,
      summaryCompleted: true,
      tasksExtracted,
      status: "completed",
    });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown workflow error";

    logger.error("Workflow: Fatal error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });

    await updateWorkflowStatus(recordingId, "failed", errorMsg);

    return err(
      error instanceof Error ? error : new Error("Workflow execution failed")
    );
  }
}

