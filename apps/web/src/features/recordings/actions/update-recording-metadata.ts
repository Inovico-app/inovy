"use server";

import { authorizedActionClient, resultToActionResponse } from "@/lib";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services";
import { updateRecordingMetadataSchema } from "@/server/validation/recordings/update-recording-metadata";
import { revalidatePath } from "next/cache";

/**
 * Update recording metadata using authorized action client
 */
export const updateRecordingMetadataAction = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(updateRecordingMetadataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw new Error("User not found");
    }

    const { id, title, description, recordingDate } = parsedInput;

    logger.info("Updating recording metadata via action", {
      component: "updateRecordingMetadataAction",
      userId: user.id,
      recordingId: id,
    });

    // Get user's organization
    const authResult = await getAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.organization
    ) {
      throw new Error("Organization not found");
    }

    const organization = authResult.value.organization;

    // Update recording via service
    const result = await RecordingService.updateRecordingMetadata(
      id,
      organization.orgCode,
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

