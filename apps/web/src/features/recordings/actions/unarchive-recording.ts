"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { RecordingService } from "@/server/services/recording.service";
import { archiveRecordingSchema } from "@/server/validation/recordings/archive-recording";
import { revalidatePath } from "next/cache";

/**
 * Unarchive recording action (uses same schema as archive)
 */
export const unarchiveRecordingAction = authorizedActionClient
  .metadata({
    name: "unarchive-recording",
    permissions: policyToPermissions("recordings:update"),
    audit: {
      resourceType: "recording",
      action: "restore",
      category: "mutation",
    },
  })
  .inputSchema(archiveRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "unarchive-recording",
      );
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "unarchive-recording",
      );
    }

    const auth: AuthContext = {
      user,
      organizationId,
      userTeamIds: ctx.userTeamIds ?? [],
    };

    // Get recording to find project ID for cache invalidation
    const recordingResult = await RecordingService.getRecordingById(
      recordingId,
      auth,
    );
    if (recordingResult.isErr() || !recordingResult.value) {
      throw ActionErrors.notFound("Recording", "unarchive-recording");
    }

    const recording = recordingResult.value;

    // Unarchive recording
    const result = await RecordingService.unarchiveRecording(
      recordingId,
      organizationId,
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "unarchive-recording",
      );
    }

    // Revalidate paths
    revalidatePath(`/projects/${recording.projectId}`);
    revalidatePath(
      `/projects/${recording.projectId}/recordings/${recordingId}`,
    );

    return { data: { success: result.value } };
  });
