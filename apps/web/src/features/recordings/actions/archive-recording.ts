"use server";

import type { AuthContext } from "@/lib/auth-context";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { RecordingService } from "@/server/services/recording.service";
import { archiveRecordingSchema } from "@/server/validation/recordings/archive-recording";
import { revalidatePath } from "next/cache";

/**
 * Archive recording action
 */
export const archiveRecordingAction = authorizedActionClient
  .metadata({
    permissions: policyToPermissions("recordings:delete"),
    audit: {
      resourceType: "recording",
      action: "archive",
      category: "mutation",
    },
  })
  .inputSchema(archiveRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId } = parsedInput;
    const { user, organizationId } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User not found", "archive-recording");
    }

    if (!organizationId) {
      throw ActionErrors.forbidden(
        "Organization context required",
        undefined,
        "archive-recording",
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
      throw ActionErrors.notFound("Recording", "archive-recording");
    }

    const recording = recordingResult.value;

    // Archive recording
    const result = await RecordingService.archiveRecording(
      recordingId,
      organizationId,
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        undefined,
        "archive-recording",
      );
    }

    // Enrich audit log via middleware
    ctx.audit?.setResourceId(recordingId);
    ctx.audit?.setMetadata({ projectId: recording.projectId });

    // Revalidate paths
    revalidatePath(`/projects/${recording.projectId}`);
    revalidatePath(
      `/projects/${recording.projectId}/recordings/${recordingId}`,
    );

    return { data: { success: result.value } };
  });
