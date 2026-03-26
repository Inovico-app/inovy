import { logger } from "@/lib/logger";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { PostActionExecutorService } from "@/server/services/post-action-executor.service";

/**
 * Execute post-meeting actions after transcription is complete.
 * Looks up the recording's meetingId and triggers post-actions if linked to a meeting.
 */
export async function executePostActionsStep(
  recordingId: string,
  organizationId: string,
): Promise<void> {
  "use step";

  try {
    const recording = await RecordingsQueries.selectRecordingById(recordingId);

    if (!recording?.meetingId) {
      return;
    }

    await PostActionExecutorService.executePostActions(
      recording.meetingId,
      organizationId,
    );

    logger.info("Post-meeting actions executed", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      meetingId: recording.meetingId,
    });
  } catch (error) {
    logger.error("Failed to execute post-meeting actions", {
      component: "ConvertRecordingWorkflow",
      recordingId,
      error,
    });
    // Don't fail the workflow on post-action errors
  }
}
