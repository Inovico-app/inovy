import { logger } from "@/lib/logger";
import { NotificationService } from "@/server/services/notification.service";
import { ok, type Result } from "neverthrow";

interface NotificationParams {
  recordingId: string;
  recordingTitle: string;
  projectId: string;
  userId: string;
  organizationId: string;
  tasksExtracted: number;
  durationMs: number;
  isReprocessing: boolean;
}

/**
 * Send Success Notification Step
 *
 * Sends a success notification to the user after the workflow completes successfully.
 * Constructs appropriate messages based on whether this is a reprocessing operation.
 *
 * @param params - Notification parameters including recording details and workflow results
 * @returns Result indicating notification was sent successfully
 */
export async function sendSuccessNotification(
  params: NotificationParams
): Promise<Result<void, Error>> {
  "use step";

  const {
    recordingId,
    recordingTitle,
    projectId,
    userId,
    organizationId,
    tasksExtracted,
    durationMs,
    isReprocessing,
  } = params;

  const notificationTitle = isReprocessing
    ? "Opname opnieuw verwerkt"
    : "Opname verwerkt";

  const notificationMessage = isReprocessing
    ? `"${recordingTitle}" is succesvol opnieuw verwerkt. ${tasksExtracted} ${
        tasksExtracted === 1 ? "taak" : "taken"
      } geëxtraheerd.`
    : `"${recordingTitle}" is succesvol verwerkt. ${tasksExtracted} ${
        tasksExtracted === 1 ? "taak" : "taken"
      } geëxtraheerd.`;

  await NotificationService.createNotification({
    recordingId,
    projectId,
    userId,
    organizationId,
    type: "recording_processed",
    title: notificationTitle,
    message: notificationMessage,
    metadata: {
      tasksExtracted,
      durationMs,
      isReprocessing,
    },
  });

  logger.info("Workflow: Success notification sent", {
    component: "ConvertRecordingWorkflow",
    recordingId,
    tasksExtracted,
    isReprocessing,
  });

  return ok(undefined);
}

