"use server";

import type { AuthContext } from "@/lib/auth-context";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { RecordingService } from "@/server/services/recording.service";
import { z } from "zod";

const getRecordingStatusSchema = z.object({
  recordingId: z.string().uuid(),
});

export const getRecordingStatusAction = authorizedActionClient
  .metadata({
    name: "get-recording-status",
    permissions: policyToPermissions("recordings:read"),
    audit: {
      resourceType: "recording",
      action: "get",
      category: "read",
    },
  })
  .schema(getRecordingStatusSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "get-recording-status",
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "get-recording-status",
      );
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Get recording
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
        "getRecordingStatusAction",
      );
    } catch (_error) {
      throw ActionErrors.notFound("Recording");
    }

    // Return only status-related fields
    return {
      id: recording.id,
      transcriptionStatus: recording.transcriptionStatus,
      updatedAt: recording.updatedAt,
    };
  });
