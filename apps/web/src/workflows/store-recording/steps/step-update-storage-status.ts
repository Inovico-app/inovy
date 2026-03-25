import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import type { RecordingStatus } from "@/server/db/schema/recordings";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

export async function updateStorageStatusStep(
  recordingId: string,
  storageStatus: RecordingStatus,
): Promise<WorkflowResult<void>> {
  "use step";

  try {
    const result = await RecordingService.updateRecordingStorage(recordingId, {
      storageStatus,
    });

    if (result.isErr()) {
      return failure(result.error);
    }

    logger.info("Storage status updated", {
      component: "StoreRecordingWorkflow",
      recordingId,
      storageStatus,
    });

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error
        ? error
        : new Error("Failed to update storage status"),
    );
  }
}
