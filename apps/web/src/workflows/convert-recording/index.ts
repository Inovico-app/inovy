"use server";

import { logger } from "@/lib/logger";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { NotificationService } from "@/server/services/notification.service";
import { err, ok, type Result } from "neverthrow";
import { updateWorkflowStatus } from "./update-status";
import { executeTranscriptionStep } from "./step-1-transcription";
import { executeSummaryStep } from "./step-2a-summary";
import { executeTaskExtractionStep } from "./step-2b-tasks";
import { executeFinalStep } from "./step-3-finalize";
import type { WorkflowResult } from "./types";

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
 * @returns WorkflowResult with completion status
 */
export async function convertRecordingIntoAiInsights(
  recordingId: string
): Promise<Result<WorkflowResult, Error>> {
  const startTime = Date.now();

  try {
    logger.info("Workflow: Starting AI insights conversion", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    // Update workflow status to running
    await updateWorkflowStatus(recordingId, "running", null, 0);

    // Get recording details
    const recordingResult = await RecordingsQueries.selectRecordingById(
      recordingId
    );

    if (recordingResult.isErr() || !recordingResult.value) {
      const errorMsg = "Recording not found";
      await updateWorkflowStatus(recordingId, "failed", errorMsg);
      return err(new Error(errorMsg));
    }

    const recording = recordingResult.value;

    // Step 1: Transcribe audio
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
    const updatedRecording = await RecordingsQueries.selectRecordingById(
      recordingId
    );

    if (updatedRecording.isErr() || !updatedRecording.value?.transcriptionText) {
      const errorMsg = "Transcription text not available";
      await updateWorkflowStatus(recordingId, "failed", errorMsg);
      return err(new Error(errorMsg));
    }

    const transcriptionText = updatedRecording.value.transcriptionText;

    // Get utterances for context
    const transcriptionInsight = await AIInsightsQueries.getInsightByType(
      recordingId,
      "transcription"
    );

    const utterances = transcriptionInsight.isOk() && transcriptionInsight.value
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

    // Check results
    const summaryCompleted =
      summaryResult.status === "fulfilled" && summaryResult.value.isOk();
    const tasksCompleted =
      taskExtractionResult.status === "fulfilled" &&
      taskExtractionResult.value.isOk();

    if (!summaryCompleted || !tasksCompleted) {
      const errors: string[] = [];
      if (!summaryCompleted) {
        const error =
          summaryResult.status === "fulfilled"
            ? summaryResult.value.error.message
            : String(summaryResult.reason);
        errors.push(`Summary: ${error}`);
      }
      if (!tasksCompleted) {
        const error =
          taskExtractionResult.status === "fulfilled"
            ? taskExtractionResult.value.error.message
            : String(taskExtractionResult.reason);
        errors.push(`Tasks: ${error}`);
      }

      const errorMsg = errors.join("; ");
      await updateWorkflowStatus(recordingId, "failed", errorMsg);
      return err(new Error(`Parallel processing failed: ${errorMsg}`));
    }

    const tasksExtracted =
      taskExtractionResult.status === "fulfilled" &&
      taskExtractionResult.value.isOk()
        ? taskExtractionResult.value.value
        : 0;

    // Step 3: Finalize
    await executeFinalStep(recordingId, recording.projectId);

    // Update workflow status to completed
    await updateWorkflowStatus(recordingId, "completed", null);

    const duration = Date.now() - startTime;
    logger.info("Workflow: Completed successfully", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      durationMs: duration,
      tasksExtracted,
    });

    // Send final success notification
    await NotificationService.createNotification({
      recordingId,
      projectId: recording.projectId,
      userId: recording.createdById,
      organizationId: recording.organizationId,
      type: "recording_processed",
      title: "Opname verwerkt",
      message: `"${recording.title}" is succesvol verwerkt. ${tasksExtracted} ${tasksExtracted === 1 ? "taak" : "taken"} geëxtraheerd.`,
      metadata: {
        tasksExtracted,
        durationMs: duration,
      },
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

