import { logger } from "@/lib/logger";
import { TaskExtractionService } from "@/server/services/task-extraction.service";
import { err, ok, type Result } from "neverthrow";
import { MAX_RETRIES, RETRY_DELAYS } from "./types";

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
  retryCount = 0
): Promise<Result<number, Error>> {
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
      utterances
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

