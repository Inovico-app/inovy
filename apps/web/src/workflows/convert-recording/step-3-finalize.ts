import { logger } from "@/lib/logger";
import { CacheInvalidation } from "@/lib/cache-utils";

/**
 * Step 3: Invalidate caches and finalize workflow
 * 
 * This step ensures all relevant caches are invalidated so that the UI
 * reflects the latest processed data (transcription, summary, tasks).
 * 
 * @param recordingId - The recording ID
 * @param projectId - The project ID
 */
export async function executeFinalStep(
  recordingId: string,
  projectId: string
): Promise<void> {
  try {
    logger.info("Workflow Step 3: Finalizing", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    // Invalidate React Query caches
    CacheInvalidation.invalidateRecording(recordingId);
    CacheInvalidation.invalidateSummary(recordingId);
    CacheInvalidation.invalidateProject(projectId);

    logger.info("Workflow Step 3: Finalization completed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });
  } catch (error) {
    logger.error("Workflow Step 3: Finalization error", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    // Don't fail the workflow on finalization errors
  }
}

