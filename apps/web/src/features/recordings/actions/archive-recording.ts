"use server";

import { authorizedActionClient } from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { RecordingService } from "../../../server/services";
import { archiveRecordingSchema } from "../../../server/validation/recordings/archive-recording";
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
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "archive-recording"
      );
    }

    // Get organization code and recording details
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "archive-recording"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Get recording to find project ID for cache invalidation
    const recordingResult = await RecordingService.getRecordingById(recordingId);
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "archive-recording");
    }

    const recording = recordingResult.value;

    // Archive recording
    const result = await RecordingService.archiveRecording(recordingId, orgCode);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "archive-recording"
      );
    }

    // Revalidate paths
    revalidatePath(`/projects/${recording.projectId}`);
    revalidatePath(`/projects/${recording.projectId}/recordings/${recordingId}`);

    return { data: { success: result.value } };
  });

