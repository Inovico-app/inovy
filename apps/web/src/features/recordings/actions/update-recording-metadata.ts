"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import { updateRecordingMetadataSchema } from "@/server/validation/recordings/update-recording-metadata";
import { revalidatePath } from "next/cache";

/**
 * Update recording metadata using authorized action client
 */
export const updateRecordingMetadataAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:update") })
  .schema(updateRecordingMetadataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const { id, title, description, recordingDate } = parsedInput;

    logger.info("Updating recording metadata via action", {
      component: "updateRecordingMetadataAction",
      userId: user.id,
      recordingId: id,
    });

    // Update recording via service
    const result = await RecordingService.updateRecordingMetadata(
      id,
      organizationId,
      {
        title,
        description: description ?? null,
        recordingDate,
      }
    );

    const response = resultToActionResponse(result);

    if (response) {
      logger.info("Recording metadata updated successfully", {
        component: "updateRecordingMetadataAction",
        recordingId: id,
      });

      // Revalidate pages that might display this recording
      revalidatePath(`/projects/[id]`, "page");

      return response;
    }

    throw new Error("Failed to update recording metadata");
  });

