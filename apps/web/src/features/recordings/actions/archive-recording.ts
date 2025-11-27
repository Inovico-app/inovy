"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import { AuditLogService } from "@/server/services/audit-log.service";
import { archiveRecordingSchema } from "@/server/validation/recordings/archive-recording";
import { revalidatePath } from "next/cache";

/**
 * Archive recording action
 */
export const archiveRecordingAction = authorizedActionClient
  .metadata({
    policy: "recordings:delete",
  })
  .inputSchema(archiveRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "archive-recording"
      );
    }

    // Get recording to find project ID for cache invalidation
    const recordingResult = await RecordingService.getRecordingById(
      recordingId
    );
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "archive-recording");
    }

    const recording = recordingResult.value;

    // Archive recording
    const result = await RecordingService.archiveRecording(
      recordingId,
      organizationId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "archive-recording"
      );
    }

    // Log audit event
    logger.audit.event("recording_archived", {
      resourceType: "recording",
      resourceId: recordingId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "archive",
      metadata: {
        projectId: recording.projectId,
      },
    });

    // Create audit log entry
    await AuditLogService.createAuditLog({
      eventType: "recording_archived",
      resourceType: "recording",
      resourceId: recordingId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "archive",
      metadata: {
        projectId: recording.projectId,
      },
    });

    // Revalidate paths
    revalidatePath(`/projects/${recording.projectId}`);
    revalidatePath(
      `/projects/${recording.projectId}/recordings/${recordingId}`
    );

    return { data: { success: result.value } };
  });

