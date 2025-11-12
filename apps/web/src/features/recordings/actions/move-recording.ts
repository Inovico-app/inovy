"use server";

import { revalidatePath } from "next/cache";
import { authorizedActionClient, resultToActionResponse } from "@/lib/action-client";
import { RecordingService } from "@/server/services/recording.service";
import { moveRecordingSchema } from "@/server/validation/recordings/move-recording";

/**
 * Server action to move a recording to another project
 * Requires recordings:update permission (available to Manager role and above)
 */
export const moveRecordingAction = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(moveRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, targetProjectId } = parsedInput;
    const { user } = ctx;

    if (!user.orgCode) {
      throw new Error("Organization code not found");
    }

    // Call the service to move the recording
    const result = await RecordingService.moveRecording(
      recordingId,
      targetProjectId,
      user.orgCode,
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

