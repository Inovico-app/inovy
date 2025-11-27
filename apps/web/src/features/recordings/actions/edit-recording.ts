"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "../../../lib/action-errors";
import { RecordingService } from "../../../server/services/recording.service";
import { updateRecordingSchema } from "../../../server/validation/recordings/update-recording";
import { revalidatePath } from "next/cache";

/**
 * Recording metadata update action
 */
export const updateRecordingAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:update"),
  })
  .inputSchema(updateRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, title, description, recordingDate } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "update-recording"
      );
    }

    // Update recording metadata
    const result = await RecordingService.updateRecordingMetadata(
      recordingId,
      organizationId,
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

