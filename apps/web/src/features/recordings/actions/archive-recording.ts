"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { AuditLogService } from "@/server/services/audit-log.service";
import { RecordingService } from "@/server/services/recording.service";
import { archiveRecordingSchema } from "@/server/validation/recordings/archive-recording";

/**
 * Archive recording action
 */
export const archiveRecordingAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:delete"),
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
    const recordingResult =
      await RecordingService.getRecordingById(recordingId);
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

    // Cache invalidation is handled by RecordingService.archiveRecording
    // which calls CacheInvalidation.invalidateRecording using updateTag

    return { data: { success: result.value } };
  });

