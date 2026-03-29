"use server";

import type { AuthContext } from "@/lib/auth-context";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { invalidateFor } from "@/lib/cache";
import { RecordingService } from "@/server/services/recording.service";
import { ReprocessingService } from "@/server/services/reprocessing.service";
import { z } from "zod";

const reprocessRecordingSchema = z.object({
  recordingId: z.string().uuid(),
});

/**
 * Reprocess AI insights for a recording
 */
export const reprocessRecordingAction = authorizedActionClient
  .metadata({
    name: "reprocess-recording",
    permissions: policyToPermissions("recordings:update"),
    audit: {
      resourceType: "recording",
      action: "reprocess",
      category: "mutation",
    },
  })
  .schema(reprocessRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Get recording to verify ownership and get project ID
    const recordingResult = await RecordingService.getRecordingById(
      recordingId,
      auth,
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
        "reprocessRecordingAction",
      );
    } catch (_error) {
      throw ActionErrors.notFound("Recording");
    }

    // Trigger reprocessing
    const reprocessResult = await ReprocessingService.triggerReprocessing(
      recordingId,
      user.id,
      organizationId,
    );

    const reprocessData = resultToActionResponse(reprocessResult);

    // Invalidate recording caches using tag-based invalidation
    invalidateFor("recording", "reprocess", {
      organizationId,
      input: { recordingId, projectId: recording.projectId },
    });

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
  .metadata({
    name: "get-reprocessing-status",
    permissions: policyToPermissions("recordings:read"),
    audit: {
      resourceType: "recording",
      action: "get",
      category: "read",
    },
  })
  .schema(getReprocessingStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    const auth2: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Get recording to verify ownership
    const recordingResult = await RecordingService.getRecordingById(
      recordingId,
      auth2,
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
        "getReprocessingStatusAction",
      );
    } catch (_error) {
      throw ActionErrors.notFound("Recording");
    }

    // Get reprocessing status
    const statusResult = await ReprocessingService.getReprocessingStatus(
      recordingId,
      organizationId,
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
