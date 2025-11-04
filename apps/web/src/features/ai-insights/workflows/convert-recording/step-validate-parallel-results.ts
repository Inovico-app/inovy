import { logger } from "@/lib/logger";
import { err, ok, type Result } from "neverthrow";
import { updateWorkflowStatus } from "./update-status";

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
  summaryResult: PromiseSettledResult<Result<void, Error>>,
  taskExtractionResult: PromiseSettledResult<Result<number, Error>>
): Promise<Result<void, Error>> {
  "use step";

  const summaryCompleted =
    summaryResult.status === "fulfilled" && summaryResult.value.isOk();
  const tasksCompleted =
    taskExtractionResult.status === "fulfilled" &&
    taskExtractionResult.value.isOk();

  if (!summaryCompleted || !tasksCompleted) {
    const errors: string[] = [];

    if (!summaryCompleted) {
      let error = "Unknown error";
      if (summaryResult.status === "fulfilled" && summaryResult.value.isErr()) {
        error = summaryResult.value.error.message;
      } else if (summaryResult.status === "rejected") {
        error = String(summaryResult.reason);
      }
      errors.push(`Summary: ${error}`);
    }

    if (!tasksCompleted) {
      let error = "Unknown error";
      if (
        taskExtractionResult.status === "fulfilled" &&
        taskExtractionResult.value.isErr()
      ) {
        error = taskExtractionResult.value.error.message;
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
    return err(new Error(`Parallel processing failed: ${errorMsg}`));
  }

  logger.info("Workflow: Parallel processing validation successful", {
    component: "ConvertRecordingWorkflow",
    recordingId,
  });

  return ok(undefined);
}

