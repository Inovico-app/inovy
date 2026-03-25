import { logger } from "@/lib/logger";
import { getStorageProvider } from "@/server/services/storage";
import type { CopyFromUrlResult } from "@/server/services/storage/storage.types";
import type { WorkflowResult } from "@/workflows/lib/workflow-result";
import { failure, success } from "@/workflows/lib/workflow-result";

export async function copyToAzureStep(
  sourceUrl: string,
  destinationPath: string,
): Promise<WorkflowResult<CopyFromUrlResult>> {
  "use step";

  try {
    logger.info("Storage workflow: Starting Azure copy", {
      component: "StoreRecordingWorkflow",
      destinationPath,
    });

    const storage = await getStorageProvider();

    if (!storage.copyFromURL) {
      return failure(
        new Error("Storage provider does not support copyFromURL"),
      );
    }

    const result = await storage.copyFromURL(sourceUrl, destinationPath, {
      access: "private",
    });

    logger.info("Storage workflow: Azure copy completed", {
      component: "StoreRecordingWorkflow",
      destinationPath,
      contentLength: result.contentLength,
    });

    return success(result);
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error("Azure copy failed"),
    );
  }
}
