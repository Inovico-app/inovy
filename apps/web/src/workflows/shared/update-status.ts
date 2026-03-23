import { invalidateFor } from "@/lib/cache";
import { logger } from "@/lib/logger";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";

/**
 * Update workflow status in database
 */
export async function updateWorkflowStatus(
  recordingId: string,
  status: "idle" | "running" | "completed" | "failed",
  error?: string,
  retryCount?: number,
): Promise<void> {
  "use step";

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

    const result = await RecordingsQueries.updateRecording(
      recordingId,
      updates,
    );

    logger.info("Workflow status updated", {
      component: "WorkflowStatus",
      recordingId,
      status,
      retryCount,
    });

    if (result) {
      invalidateFor("recording", "update", {
        organizationId: result.organizationId,
        input: { recordingId, projectId: result.projectId },
      });
    }
  } catch (updateError) {
    logger.error("Failed to update workflow status", {
      component: "WorkflowStatus",
      recordingId,
      error: updateError,
    });
  }
}
