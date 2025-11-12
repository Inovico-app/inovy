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
    if (!ctx.user || !ctx.organizationId) {
      throw new Error("User and organization context required");
    }

    const result = await TranscriptionEditService.restoreTranscriptionVersion(
      parsedInput.recordingId,
      parsedInput.versionNumber,
      ctx.user.id,
      ctx.organizationId
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

