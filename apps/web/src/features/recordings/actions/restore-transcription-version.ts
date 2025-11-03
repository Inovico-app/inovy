"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/action-client";
import { TranscriptionEditService } from "@/server/services";

const restoreTranscriptionVersionSchema = z.object({
  recordingId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
});

/**
 * Server action to restore a previous transcription version
 */
export const restoreTranscriptionVersion = authorizedActionClient
  .metadata({ policy: "recordings:update" })
  .schema(restoreTranscriptionVersionSchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.user) {
      throw new Error("User not authenticated");
    }

    const result = await TranscriptionEditService.restoreTranscriptionVersion(
      parsedInput.recordingId,
      parsedInput.versionNumber,
      ctx.user.id
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

