"use server";

import type { AuthContext } from "@/lib/auth-context";
import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { RecordingService } from "@/server/services/recording.service";
import { deleteRecordingSchema } from "@/server/validation/recordings/delete-recording";
import { getStorageProvider } from "@/server/services/storage";
import { revalidatePath } from "next/cache";

/**
 * Delete recording action (hard delete with blob cleanup)
 */
export const deleteRecordingAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:delete"),
    audit: {
      resourceType: "recording",
      action: "delete",
      category: "mutation",
    },
  })
  .inputSchema(deleteRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, confirmationText } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "delete-recording",
      );
    }

    const auth: AuthContext = {
      user: ctx.user!,
      organizationId: ctx.organizationId!,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Get recording to get file URL and validate confirmation
    const recordingResult = await RecordingService.getRecordingById(
      recordingId,
      auth,
    );
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "delete-recording");
    }

    const recording = recordingResult.value;

    // Validate confirmation text (must be "DELETE" or recording title)
    if (confirmationText !== "DELETE" && confirmationText !== recording.title) {
      throw ActionErrors.validation(
        "Confirmation text does not match. Please type DELETE or the exact recording title.",
        { confirmationText },
      );
    }

    // Delete from database first (this will cascade to related records)
    const result = await RecordingService.deleteRecording(
      recordingId,
      organizationId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Enrich audit log via middleware
    ctx.audit?.setResourceId(recordingId);
    ctx.audit?.setMetadata({
      recordingTitle: recording.title,
      projectId: recording.projectId,
    });

    // Delete file from blob storage
    try {
      const storage = await getStorageProvider();
      await storage.del(recording.fileUrl);
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
