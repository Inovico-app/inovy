"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { TranscriptionEditService } from "@/server/services/transcription-edit.service";
import {
  updateTranscriptionSchema,
  type UpdateTranscriptionInput,
} from "@/server/validation/recordings/update-transcription";

/**
 * Server action to update transcription content
 * Creates a new version in history and marks as manually edited
 */
export const updateTranscription = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:update") })
  .schema(updateTranscriptionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user || !ctx.organizationId) {
      throw new Error("User and organization context required");
    }

    const result = await TranscriptionEditService.updateTranscription(
      parsedInput,
      ctx.user.id,
      ctx.organizationId
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

