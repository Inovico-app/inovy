"use server";

import { authorizedActionClient } from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { RecordingService } from "../../../server/services";
import { deleteRecordingSchema } from "../../../server/validation/recordings/delete-recording";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { logger } from "../../../lib/logger";

/**
 * Delete recording action (hard delete with blob cleanup)
 */
export const deleteRecordingAction = authorizedActionClient
  .metadata({
    policy: "recordings:delete",
  })
  .inputSchema(deleteRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, confirmationText } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "delete-recording"
      );
    }

    // Get organization code and recording details
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "delete-recording"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Get recording to get file URL and validate confirmation
    const recordingResult = await RecordingService.getRecordingById(recordingId);
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "delete-recording");
    }

    const recording = recordingResult.value;

    // Validate confirmation text (must be "DELETE" or recording title)
    if (
      confirmationText !== "DELETE" &&
      confirmationText !== recording.title
    ) {
      throw ActionErrors.validation(
        "Confirmation text does not match. Please type DELETE or the exact recording title.",
        { confirmationText }
      );
    }

    // Delete from database first (this will cascade to related records)
    const result = await RecordingService.deleteRecording(recordingId, orgCode);

    if (result.isErr()) {
      throw result.error;
    }

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

