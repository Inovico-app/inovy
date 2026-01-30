"use server";

import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { revalidatePath } from "next/cache";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "../../../lib/server-action-client/action-client";
import { ActionErrors } from "../../../lib/server-action-client/action-errors";
import { RecordingService } from "../../../server/services/recording.service";
import { updateRecordingSchema } from "../../../server/validation/recordings/update-recording";

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
    revalidatePath(
      `/projects/${recording.projectId}/recordings/${recordingId}`
    );
    revalidatePath(`/projects/${recording.projectId}`);
    revalidatePath("/recordings");

    // Convert Result to action response
    return resultToActionResponse(result);
  });

