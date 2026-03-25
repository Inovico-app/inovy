import { logger } from "@/lib/logger";
import { RecallApiService } from "@/server/services/recall-api.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

interface RecallUrlResult {
  url: string;
  duration: number | null;
  mimeType: string;
}

export async function fetchRecallDownloadUrl(
  recallBotId: string,
  externalRecordingId: string,
): Promise<WorkflowResult<RecallUrlResult>> {
  "use step";

  try {
    const result = await RecallApiService.getRecordingDownloadUrl(
      recallBotId,
      externalRecordingId,
    );

    if (result.isErr()) {
      logger.error("Failed to get Recall download URL", {
        component: "StoreRecordingWorkflow",
        recallBotId,
        externalRecordingId,
        error: result.error,
      });
      return failure(result.error);
    }

    return success({
      url: result.value.url,
      duration: result.value.duration ?? null,
      mimeType: result.value.format ?? "video/mp4",
    });
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Failed to fetch Recall URL"),
    );
  }
}
