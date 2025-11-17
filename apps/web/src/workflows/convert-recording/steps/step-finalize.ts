import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { RAGService } from "@/server/services/rag/rag.service";

/**
 * Step 3: Invalidate caches, create embeddings, and finalize workflow
 *
 * This step ensures all relevant caches are invalidated so that the UI
 * reflects the latest processed data (transcription, summary, tasks).
 * It also creates embeddings for the chat feature.
 *
 * @param recordingId - The recording ID
 * @param projectId - The project ID
 * @param orgCode - The organization code
 */
export async function executeFinalStep(
  recordingId: string,
  projectId: string,
  orgCode: string
): Promise<void> {
  "use step";

  try {
    logger.info("Workflow Step 3: Finalizing", {
      component: "ConvertRecordingWorkflow",
      recordingId,
    });

    // Create embeddings for chat feature (async, don't block workflow)
    const ragService = new RAGService();
    ragService
      .indexRecording(recordingId, projectId, orgCode)
      .then((result) => {
        if (result.isOk()) {
          logger.info("Embeddings created successfully for recording", {
            component: "ConvertRecordingWorkflow",
            recordingId,
          });
        } else {
          logger.error("Failed to create embeddings for recording", {
            component: "ConvertRecordingWorkflow",
            recordingId,
            error: result.error,
          });
        }
      })
      .catch((error) => {
        logger.error("Error creating embeddings for recording", {
          component: "ConvertRecordingWorkflow",
          recordingId,
          error,
        });
      });

    // Invalidate React Query caches
    CacheInvalidation.invalidateSummary(recordingId);
    CacheInvalidation.invalidateProject(projectId, orgCode);

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

