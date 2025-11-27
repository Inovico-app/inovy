"use server";

import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "@/lib/action-errors";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { RecordingService } from "@/server/services/recording.service";
import { z } from "zod";

const getRecordingStatusSchema = z.object({
  recordingId: z.string().uuid(),
});

export const getRecordingStatusAction = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:read") })
  .schema(getRecordingStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    // Get recording
    const recordingResult = await RecordingService.getRecordingById(
      recordingId
    );
    const recording = resultToActionResponse(recordingResult);

    if (!recording) {
      throw ActionErrors.notFound("Recording");
    }

    // Verify recording belongs to user's organization
    try {
      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "getRecordingStatusAction"
      );
    } catch (error) {
      throw ActionErrors.notFound("Recording");
    }

    // Return only status-related fields
    return {
      id: recording.id,
      transcriptionStatus: recording.transcriptionStatus,
      updatedAt: recording.updatedAt,
    };
  });

