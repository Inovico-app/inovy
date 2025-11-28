"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AuditLogService } from "@/server/services/audit-log.service";
import { RecordingService } from "@/server/services/recording.service";
import { deleteRecordingSchema } from "@/server/validation/recordings/delete-recording";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

/**
 * Delete recording action (hard delete with blob cleanup)
 */
export const deleteRecordingAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:delete"),
  })
  .inputSchema(deleteRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, confirmationText } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "delete-recording"
      );
    }

    // Get recording to get file URL and validate confirmation
    const recordingResult =
      await RecordingService.getRecordingById(recordingId);
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "delete-recording");
    }

    const recording = recordingResult.value;

    // Validate confirmation text (must be "DELETE" or recording title)
    if (confirmationText !== "DELETE" && confirmationText !== recording.title) {
      throw ActionErrors.validation(
        "Confirmation text does not match. Please type DELETE or the exact recording title.",
        { confirmationText }
      );
    }

    // Delete from database first (this will cascade to related records)
    const result = await RecordingService.deleteRecording(
      recordingId,
      organizationId
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Log audit event
    logger.audit.event("recording_deleted", {
      resourceType: "recording",
      resourceId: recordingId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "delete",
      metadata: {
        recordingTitle: recording.title,
        projectId: recording.projectId,
      },
    });

    // Create audit log entry
    await AuditLogService.createAuditLog({
      eventType: "recording_deleted",
      resourceType: "recording",
      resourceId: recordingId,
      userId: ctx.user?.id ?? "unknown",
      organizationId,
      action: "delete",
      metadata: {
        recordingTitle: recording.title,
        projectId: recording.projectId,
      },
    });

    // Delete file from Vercel Blob
    try {
      await del(recording.fileUrl);
      logger.info("Successfully deleted blob file", {
        component: "deleteRecordingAction",
        recordingId,
        fileUrl: recording.fileUrl,
      });
    } catch (error) {
      // Log the error but don't fail the entire operation
      // The recording is already deleted from the database
      logger.error("Failed to delete blob file", {
        component: "deleteRecordingAction",
        recordingId,
        fileUrl: recording.fileUrl,
        error,
      });
    }

    // Revalidate paths
    revalidatePath(`/projects/${recording.projectId}`);

    return { data: { success: true, projectId: recording.projectId } };
  });

