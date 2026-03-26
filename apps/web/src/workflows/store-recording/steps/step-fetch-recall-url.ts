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

    const rawFormat = result.value.format ?? "mp4";
    const FORMAT_TO_MIME: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      mp3: "audio/mp3",
      wav: "audio/wav",
      m4a: "audio/m4a",
    };
    const mimeType = rawFormat.includes("/")
      ? rawFormat
      : (FORMAT_TO_MIME[rawFormat] ?? "video/mp4");

    return success({
      url: result.value.url,
      duration: result.value.duration ?? null,
      mimeType,
    });
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Failed to fetch Recall URL"),
    );
  }
}
