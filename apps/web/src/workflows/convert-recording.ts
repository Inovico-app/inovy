"use server";

import { logger } from "@/lib/logger";
import { CacheInvalidation } from "@/lib/cache-utils";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { TranscriptionService } from "@/server/services/transcription.service";
import { SummaryService } from "@/server/services/summary.service";
import { TaskExtractionService } from "@/server/services/task-extraction.service";
import { NotificationService } from "@/server/services/notification.service";
import { err, ok, type Result } from "neverthrow";

/**
 * Workflow configuration
 */
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // ms: 1s, 5s, 15s

/**
 * Workflow execution result
 */
interface WorkflowResult {
  recordingId: string;
  transcriptionCompleted: boolean;
  summaryCompleted: boolean;
  tasksExtracted: number;
  status: "completed" | "failed";
  error?: string;
}

/**
 * Update workflow status in database
 */
async function updateWorkflowStatus(
  recordingId: string,
  status: "idle" | "running" | "completed" | "failed",
  error?: string,
  retryCount?: number
): Promise<void> {
  try {
    const updates: {
      workflowStatus: "idle" | "running" | "completed" | "failed";
      workflowError?: string | null;
      workflowRetryCount?: number;
    } = {
      workflowStatus: status,
    };

    if (error !== undefined) {
      updates.workflowError = error;
    }

    if (retryCount !== undefined) {
      updates.workflowRetryCount = retryCount;
    }

    await RecordingsQueries.updateRecording(recordingId, updates);

    logger.info("Workflow status updated", {
      component: "WorkflowStatus",
      recordingId,
      status,
      retryCount,
    });
  } catch (updateError) {
    logger.error("Failed to update workflow status", {
      component: "WorkflowStatus",
      recordingId,
      error: updateError,
    });
  }
}

/**
 * Step 1: Transcribe audio using Deepgram
 */
async function executeTranscriptionStep(
  recordingId: string,
  fileUrl: string,
  retryCount = 0
): Promise<Result<void, Error>> {
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
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn("Transcription failed, retrying...", {
          component: "ConvertRecordingWorkflow",
          recordingId,
          retryCount: retryCount + 1,
          delayMs: delay,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeTranscriptionStep(recordingId, fileUrl, retryCount + 1);
      }

      return err(result.error);
    }

    logger.info("Workflow Step 1: Transcription completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    return ok(undefined);
  } catch (error) {
    logger.error("Workflow Step 1: Transcription error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    return err(
      error instanceof Error ? error : new Error("Transcription failed")
    );
  }
}

/**
 * Step 2a: Generate summary using OpenAI
 */
async function executeSummaryStep(
  recordingId: string,
  transcriptionText: string,
  utterances?: Array<{ speaker: number; text: string }>,
  retryCount = 0
): Promise<Result<void, Error>> {
  try {
    logger.info("Workflow Step 2a: Starting summary generation", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      retryCount,
    });

    const result = await SummaryService.generateSummary(
      recordingId,
      transcriptionText,
      utterances
    );

    if (result.isErr()) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn("Summary generation failed, retrying...", {
          component: "ConvertRecordingWorkflow",
          recordingId,
          retryCount: retryCount + 1,
          delayMs: delay,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeSummaryStep(
          recordingId,
          transcriptionText,
          utterances,
          retryCount + 1
        );
      }

      return err(result.error);
    }

    logger.info("Workflow Step 2a: Summary completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    return ok(undefined);
  } catch (error) {
    logger.error("Workflow Step 2a: Summary error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    return err(
      error instanceof Error ? error : new Error("Summary generation failed")
    );
  }
}

/**
 * Step 2b: Extract tasks using OpenAI
 */
async function executeTaskExtractionStep(
  recordingId: string,
  projectId: string,
  transcriptionText: string,
  organizationId: string,
  createdById: string,
  utterances?: Array<{ speaker: number; text: string; start: number }>,
  retryCount = 0
): Promise<Result<number, Error>> {
  try {
    logger.info("Workflow Step 2b: Starting task extraction", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      retryCount,
    });

    const result = await TaskExtractionService.extractTasks(
      recordingId,
      projectId,
      transcriptionText,
      organizationId,
      createdById,
      utterances
    );

    if (result.isErr()) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn("Task extraction failed, retrying...", {
          component: "ConvertRecordingWorkflow",
          recordingId,
          retryCount: retryCount + 1,
          delayMs: delay,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeTaskExtractionStep(
          recordingId,
          projectId,
          transcriptionText,
          organizationId,
          createdById,
          utterances,
          retryCount + 1
        );
      }

      return err(result.error);
    }

    logger.info("Workflow Step 2b: Task extraction completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      tasksExtracted: result.value.totalExtracted,
    });

    return ok(result.value.totalExtracted);
  } catch (error) {
    logger.error("Workflow Step 2b: Task extraction error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    return err(
      error instanceof Error ? error : new Error("Task extraction failed")
    );
  }
}

/**
 * Step 3: Invalidate caches and send final notification
 */
async function executeFinalStep(
  recordingId: string,
  projectId: string,
  tasksExtracted: number
): Promise<void> {
  try {
    logger.info("Workflow Step 3: Finalizing", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    // Invalidate React Query caches
    CacheInvalidation.invalidateRecording(recordingId);
    CacheInvalidation.invalidateSummary(recordingId);
    CacheInvalidation.invalidateProject(projectId);

    logger.info("Workflow Step 3: Finalization completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });
  } catch (error) {
    logger.error("Workflow Step 3: Finalization error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    // Don't fail the workflow on finalization errors
  }
}

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
    await executeFinalStep(recordingId, recording.projectId, tasksExtracted);

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

