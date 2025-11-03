"use server";

import { authorizedActionClient, resultToActionResponse } from "@/lib";
import { getAuthSession } from "@/lib/auth";
import { RecordingService, ReprocessingService } from "@/server/services";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const reprocessRecordingSchema = z.object({
  recordingId: z.string().uuid(),
});

/**
 * Reprocess AI insights for a recording
 */
export const reprocessRecordingAction = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(reprocessRecordingSchema)
  .action(async ({ parsedInput }) => {
    const { recordingId } = parsedInput;

    // Get auth session for user and organization context
    const authResult = await getAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.user ||
      !authResult.value.organization
    ) {
      throw new Error("Authentication required");
    }

    const { user, organization } = authResult.value;

    // Get recording to verify ownership and get project ID
    const recordingResult = await RecordingService.getRecordingById(
      recordingId
    );
    const recording = resultToActionResponse(recordingResult);

    if (!recording) {
      throw new Error("Recording not found");
    }

    // Verify recording belongs to user's organization
    if (recording.organizationId !== organization.orgCode) {
      throw new Error("You don't have permission to reprocess this recording");
    }

    // Trigger reprocessing
    const reprocessResult = await ReprocessingService.triggerReprocessing(
      recordingId,
      user.id
    );

    const reprocessData = resultToActionResponse(reprocessResult);

    // Revalidate the recording detail page
    revalidatePath(`/projects/${recording.projectId}/recordings/${recordingId}`);
    revalidatePath(`/projects/${recording.projectId}`);

    return {
      success: true,
      reprocessingId: reprocessData.reprocessingId,
      message: "Reprocessing started successfully",
    };
  });

const getReprocessingStatusSchema = z.object({
  recordingId: z.string().uuid(),
});

/**
 * Get reprocessing status for a recording
 */
export const getReprocessingStatusAction = authorizedActionClient
  .metadata({ policy: "recordings:read" })
  .schema(getReprocessingStatusSchema)
  .action(async ({ parsedInput }) => {
    const { recordingId } = parsedInput;

    // Get auth session for organization context
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.organization) {
      throw new Error("Organization context required");
    }

    const { organization } = authResult.value;

    // Get recording to verify ownership
    const recordingResult = await RecordingService.getRecordingById(
      recordingId
    );
    const recording = resultToActionResponse(recordingResult);

    if (!recording) {
      throw new Error("Recording not found");
    }

    // Verify recording belongs to user's organization
    if (recording.organizationId !== organization.orgCode) {
      throw new Error(
        "You don't have permission to view this recording's status"
      );
    }

    // Get reprocessing status
    const statusResult = await ReprocessingService.getReprocessingStatus(
      recordingId
    );

    const status = resultToActionResponse(statusResult);

    return {
      recordingId,
      workflowStatus: recording.workflowStatus,
      workflowError: recording.workflowError,
      lastReprocessedAt: recording.lastReprocessedAt,
      ...status,
    };
  });

