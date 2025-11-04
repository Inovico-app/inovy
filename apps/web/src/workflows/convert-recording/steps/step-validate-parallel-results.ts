import { logger } from "@/lib/logger";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";
import { updateWorkflowStatus } from "../../shared/update-status";

/**
 * Validate Parallel Processing Results Step
 *
 * Validates the results from parallel processing of summary and task extraction.
 * Collects detailed error messages if either step failed.
 *
 * @param recordingId - The recording being processed
 * @param summaryResult - Result from the summary step
 * @param taskExtractionResult - Result from the task extraction step
 * @returns Result indicating validation success or aggregated errors
 */
export async function validateParallelResults(
  recordingId: string,
  summaryResult: PromiseSettledResult<WorkflowResult<void>>,
  taskExtractionResult: PromiseSettledResult<WorkflowResult<number>>
): Promise<WorkflowResult<void>> {
  "use step";

  const summaryCompleted =
    summaryResult.status === "fulfilled" && summaryResult.value.success;
  const tasksCompleted =
    taskExtractionResult.status === "fulfilled" &&
    taskExtractionResult.value.success;

  if (!summaryCompleted || !tasksCompleted) {
    const errors: string[] = [];

    if (!summaryCompleted) {
      let error = "Unknown error";
      if (
        summaryResult.status === "fulfilled" &&
        !summaryResult.value.success
      ) {
        error = summaryResult.value.error;
      } else if (summaryResult.status === "rejected") {
        error = String(summaryResult.reason);
      }
      errors.push(`Summary: ${error}`);
    }

    if (!tasksCompleted) {
      let error = "Unknown error";
      if (
        taskExtractionResult.status === "fulfilled" &&
        !taskExtractionResult.value.success
      ) {
        error = taskExtractionResult.value.error;
      } else if (taskExtractionResult.status === "rejected") {
        error = String(taskExtractionResult.reason);
      }
      errors.push(`Tasks: ${error}`);
    }

    const errorMsg = errors.join("; ");

    logger.error("Workflow: Parallel processing validation failed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      errors,
    });

    await updateWorkflowStatus(recordingId, "failed", errorMsg);
    return failure(`Parallel processing failed: ${errorMsg}`);
  }

  logger.info("Workflow: Parallel processing validation successful", {
    component: "ConvertRecordingWorkflow",
    recordingId,
  });

  return success(undefined);
}

