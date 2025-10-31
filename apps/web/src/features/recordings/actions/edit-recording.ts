"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { ActionErrors } from "../../../lib/action-errors";
import { getAuthSession } from "../../../lib/auth";
import { RecordingService } from "../../../server/services";
import { updateRecordingSchema } from "../../../server/validation/recordings/update-recording";
import { revalidatePath } from "next/cache";

/**
 * Recording metadata update action
 */
export const updateRecordingAction = authorizedActionClient
  .metadata({
    policy: "recordings:update",
  })
  .inputSchema(updateRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, title, description, recordingDate } = parsedInput;
    const { user, session } = ctx;

    if (!user || !session) {
      throw ActionErrors.unauthenticated(
        "User or session not found",
        "update-recording"
      );
    }

    // Get organization code from session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw ActionErrors.internal(
        "Failed to get organization context",
        undefined,
        "update-recording"
      );
    }

    const orgCode = authResult.value.organization.orgCode;

    // Update recording metadata
    const result = await RecordingService.updateRecordingMetadata(
      recordingId,
      orgCode,
      {
        title,
        description: description ?? null,
        recordingDate,
      }
    );

    if (result.isErr()) {
      throw result.error;
    }

    // Get the recording to revalidate the correct path
    const recording = result.value;
    revalidatePath(`/projects/${recording.projectId}/recordings/${recordingId}`);
    revalidatePath(`/projects/${recording.projectId}`);

    // Convert Result to action response
    return resultToActionResponse(result);
  });

