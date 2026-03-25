import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

interface UpdateRecordingParams {
  recordingId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  fileMimeType: string | null;
}

export async function updateRecordingStorageStep(
  params: UpdateRecordingParams,
): Promise<WorkflowResult<void>> {
  "use step";

  try {
    const result = await RecordingService.updateRecordingStorage(
      params.recordingId,
      {
        fileUrl: params.fileUrl,
        fileName: params.fileName,
        fileSize: params.fileSize ?? 0,
        fileMimeType: params.fileMimeType ?? "video/mp4",
        storageStatus: "completed",
      },
    );

    if (result.isErr()) {
      return failure(result.error);
    }

    logger.info("Storage workflow: Recording updated with blob URL", {
      component: "StoreRecordingWorkflow",
      recordingId: params.recordingId,
      fileUrl: params.fileUrl,
    });

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Failed to update recording"),
    );
  }
}
