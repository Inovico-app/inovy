"use server";

import { authorizedActionClient, resultToActionResponse } from "@/lib";
import { getAuthSession } from "@/lib/auth";
import { RecordingService } from "@/server/services";
import { z } from "zod";

const getRecordingStatusSchema = z.object({
  recordingId: z.string().uuid(),
});

export const getRecordingStatusAction = authorizedActionClient
  .metadata({ policy: "recordings:read" })
  .schema(getRecordingStatusSchema)
  .action(async ({ parsedInput }) => {
    const { recordingId } = parsedInput;

    // Get auth session for organization context
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw new Error("Organization context required");
    }

    const { organization } = authResult.value;

    // Get recording
    const recordingResult = await RecordingService.getRecordingById(
      recordingId
    );
    const recording = resultToActionResponse(recordingResult);

    if (!recording) {
      throw new Error("Recording not found");
    }

    // Verify recording belongs to user's organization
    if (recording.organizationId !== organization.orgCode) {
      throw new Error("You don't have permission to access this recording");
    }

    // Return only status-related fields
    return {
      id: recording.id,
      transcriptionStatus: recording.transcriptionStatus,
      updatedAt: recording.updatedAt,
    };
  });

