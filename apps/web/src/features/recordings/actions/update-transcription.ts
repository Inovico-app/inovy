"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { TranscriptionEditService } from "@/server/services";
import {
  updateTranscriptionSchema,
  type UpdateTranscriptionInput,
} from "@/server/validation/recordings/update-transcription";

/**
 * Server action to update transcription content
 * Creates a new version in history and marks as manually edited
 */
export const updateTranscription = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(updateTranscriptionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    const result = await TranscriptionEditService.updateTranscription(
      parsedInput,
      ctx.user.id
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

