"use server";

import { ActionErrors } from "@/lib/action-errors";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { RecordingService } from "@/server/services/recording.service";
import { moveRecordingSchema } from "@/server/validation/recordings/move-recording";
import { revalidatePath } from "next/cache";

/**
 * Server action to move a recording to another project
 * Requires recordings:update permission (available to Manager role and above)
 */
export const moveRecordingAction = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(moveRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, targetProjectId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found in context",
        "move-recording"
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "move-recording"
      );
    }

    // Call the service to move the recording
    const result = await RecordingService.moveRecording(
      recordingId,
      targetProjectId,
      organizationId,
      user.id
    );

    // Convert Result to action response (throws if error)
    const movedRecording = resultToActionResponse(result);

    // Revalidate paths for both source and target projects
    // Note: We invalidate the cache in the service, but we also revalidate paths here
    revalidatePath(`/projects/${movedRecording.projectId}`);
    revalidatePath(`/projects/${movedRecording.projectId}/recordings`);

    return {
      success: true,
      recording: movedRecording,
    };
  });

