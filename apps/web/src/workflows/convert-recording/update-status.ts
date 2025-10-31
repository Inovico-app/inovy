import { logger } from "@/lib/logger";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";

/**
 * Update workflow status in database
 */
export async function updateWorkflowStatus(
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

