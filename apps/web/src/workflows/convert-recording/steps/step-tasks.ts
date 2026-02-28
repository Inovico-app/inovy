import { logger } from "@/lib/logger";
import { TaskExtractionService } from "@/server/services/task-extraction.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";
import { MAX_RETRIES, RETRY_DELAYS } from "../types";

/**
 * Step 2b: Extract tasks using OpenAI
 *
 * This step analyzes the transcription and extracts action items with priorities,
 * assignees, and due dates. Runs in parallel with summary generation (Step 2a).
 *
 * @param recordingId - The recording to extract tasks from
 * @param projectId - The project this recording belongs to
 * @param transcriptionText - The transcribed text
 * @param organizationId - The organization ID
 * @param createdById - The user who created the recording
 * @param utterances - Optional speaker utterances for context
 * @param language - ISO 639-1 language code for output (default: "nl")
 * @param retryCount - Current retry attempt (for internal use)
 * @returns Result with number of tasks extracted or error
 */
export async function executeTaskExtractionStep(
  recordingId: string,
  projectId: string,
  transcriptionText: string,
  organizationId: string,
  createdById: string,
  utterances?: Array<{ speaker: number; text: string; start: number }>,
  language = "nl",
  retryCount = 0
): Promise<WorkflowResult<number>> {
  "use step";

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
      utterances,
      language
    );

    if (result.isErr()) {
      if (retryCount < MAX_RETRIES) {
        const delay =
          RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
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
          language,
          retryCount + 1
        );
      }

      return failure(result.error);
    }

    logger.info("Workflow Step 2b: Task extraction completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      tasksExtracted: result.value.totalExtracted,
    });

    return success(result.value.totalExtracted);
  } catch (error) {
    logger.error("Workflow Step 2b: Task extraction error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    return failure(
      error instanceof Error ? error : new Error("Task extraction failed")
    );
  }
}

