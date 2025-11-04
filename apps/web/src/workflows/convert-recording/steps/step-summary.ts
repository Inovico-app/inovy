import { logger } from "@/lib/logger";
import { SummaryService } from "@/server/services/summary.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";
import { MAX_RETRIES, RETRY_DELAYS } from "../types";

/**
 * Step 2a: Generate summary using OpenAI
 *
 * This step analyzes the transcription and generates a structured summary
 * including main topics, decisions, speaker contributions, and key quotes.
 * Runs in parallel with task extraction (Step 2b).
 *
 * @param recordingId - The recording to summarize
 * @param transcriptionText - The transcribed text
 * @param utterances - Optional speaker utterances for context
 * @param retryCount - Current retry attempt (for internal use)
 * @returns Result indicating success or failure
 */
export async function executeSummaryStep(
  recordingId: string,
  transcriptionText: string,
  utterances?: Array<{ speaker: number; text: string }>,
  retryCount = 0
): Promise<WorkflowResult<void>> {
  "use step";

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
        const delay =
          RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
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

      return failure(result.error);
    }

    logger.info("Workflow Step 2a: Summary completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    return success(undefined);
  } catch (error) {
    logger.error("Workflow Step 2a: Summary error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    return failure(
      error instanceof Error ? error : new Error("Summary generation failed")
    );
  }
}

