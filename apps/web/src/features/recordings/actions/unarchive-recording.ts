"use server";

import { revalidatePath } from "next/cache";
import { authorizedActionClient } from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { RecordingService } from "../../../server/services";
import { archiveRecordingSchema } from "../../../server/validation/recordings/archive-recording";

/**
 * Unarchive recording action (uses same schema as archive)
 */
export const unarchiveRecordingAction = authorizedActionClient
  .metadata({
    policy: "recordings:update",
  })
  .inputSchema(archiveRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "unarchive-recording"
      );
    }

    // Get organization code and recording details
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "unarchive-recording"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Get recording to find project ID for cache invalidation
    const recordingResult = await RecordingService.getRecordingById(
      recordingId
    );
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "unarchive-recording");
    }

    const recording = recordingResult.value;

    // Unarchive recording
    const result = await RecordingService.unarchiveRecording(
      recordingId,
      orgCode
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "unarchive-recording"
      );
    }

    // Revalidate paths
    revalidatePath(`/projects/${recording.projectId}`);
    revalidatePath(
      `/projects/${recording.projectId}/recordings/${recordingId}`
    );

    return { data: { success: result.value } };
  });

