import { logger } from "@/lib/logger";
import { RecallApiService } from "@/server/services/recall-api.service";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

export async function fetchRecallUrlStep(
  recallBotId: string,
  externalRecordingId: string,
): Promise<WorkflowResult<string>> {
  "use step";

  try {
    const result = await RecallApiService.getRecordingDownloadUrl(
      recallBotId,
      externalRecordingId,
    );

    if (result.isErr()) {
      logger.error("Failed to get Recall download URL", {
        component: "ConvertRecordingWorkflow",
        recallBotId,
        externalRecordingId,
        error: result.error,
      });
      return failure(result.error);
    }

    return success(result.value.url);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Failed to fetch Recall URL"),
    );
  }
}
