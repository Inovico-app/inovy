import { logger } from "@/lib/logger";
import type { WorkflowResult as SerializableResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";
import { copyToAzureStep } from "./steps/step-copy-to-azure";
import { fetchRecallDownloadUrl } from "./steps/step-fetch-recall-url";
import { updateRecordingStorageStep } from "./steps/step-update-recording";
import { updateStorageStatusStep } from "./steps/step-update-storage-status";
import { MAX_RETRIES, RETRY_DELAYS, type StorageWorkflowResult } from "./types";

const MIME_TO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/m4a": "m4a",
};

/**
 * Main Workflow: Store Recording from Recall.ai to Azure Blob Storage
 *
 * This workflow copies a Recall.ai recording to Azure Blob Storage
 * using server-side copy (zero memory — data never passes through this process).
 *
 * Features:
 * - Fetches a fresh Recall.ai download URL for each retry attempt
 * - Automatic retries with exponential backoff (up to MAX_RETRIES)
 * - Storage status tracking in database
 * - Error handling with detailed logging
 *
 * @param recordingId - The internal recording ID
 * @param recallBotId - The Recall.ai bot ID
 * @param externalRecordingId - The Recall.ai recording ID
 * @returns SerializableResult with completion status and blob URL
 */
export async function storeRecordingFromRecall(
  recordingId: string,
  recallBotId: string,
  externalRecordingId: string,
): Promise<SerializableResult<StorageWorkflowResult>> {
  "use workflow";

  try {
    logger.info("Storage workflow: Starting", {
      component: "StoreRecordingWorkflow",
      recordingId,
      recallBotId,
    });

    await updateStorageStatusStep(recordingId, "processing");

    const timestamp = Date.now();
    let lastError: string = "Unknown error";

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay =
          RETRY_DELAYS[attempt - 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
        logger.warn("Storage workflow: Retrying with fresh URL", {
          component: "StoreRecordingWorkflow",
          recordingId,
          attempt,
          delayMs: delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const urlResult = await fetchRecallDownloadUrl(
        recallBotId,
        externalRecordingId,
      );

      if (!urlResult.success || !urlResult.value) {
        lastError = "Failed to fetch Recall download URL";
        continue;
      }

      const { url, mimeType } = urlResult.value;
      const ext = MIME_TO_EXT[mimeType] ?? "mp4";
      const finalFileName = `recall-${externalRecordingId}.${ext}`;
      const destinationPath = `recordings/${timestamp}-${finalFileName}`;

      const copyResult = await copyToAzureStep(url, destinationPath);

      if (!copyResult.success || !copyResult.value) {
        lastError = "Failed to copy recording to Azure";
        continue;
      }

      const updateResult = await updateRecordingStorageStep({
        recordingId,
        fileUrl: copyResult.value.url,
        fileName: finalFileName,
        fileSize: copyResult.value.contentLength,
        fileMimeType: copyResult.value.contentType,
      });

      if (!updateResult.success) {
        lastError = "Failed to update recording with blob URL";
        continue;
      }

      logger.info("Storage workflow: Completed", {
        component: "StoreRecordingWorkflow",
        recordingId,
        blobUrl: copyResult.value.url,
      });

      return success({
        recordingId,
        blobUrl: copyResult.value.url,
        status: "completed",
      });
    }

    await updateStorageStatusStep(recordingId, "failed");

    return failure(lastError);
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown storage workflow error";

    logger.error("Storage workflow: Fatal error", {
      component: "StoreRecordingWorkflow",
      recordingId,
      error,
    });

    await updateStorageStatusStep(recordingId, "failed");

    return failure(errorMsg);
  }
}
