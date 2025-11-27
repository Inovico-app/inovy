"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/action-client";
import { TranscriptionEditService } from "@/server/services/transcription-edit.service";

const getTranscriptionHistorySchema = z.object({
  recordingId: z.string().uuid(),
});

/**
 * Server action to get transcription version history
 */
export const getTranscriptionHistory = authorizedActionClient
  .metadata({ policy: "recordings:read" })
  .schema(getTranscriptionHistorySchema)
  .action(async ({ parsedInput, ctx }) => {
    if (!ctx.organizationId) {
      throw new Error("Organization context required");
    }

    const result = await TranscriptionEditService.getTranscriptionHistory(
      parsedInput.recordingId,
      ctx.organizationId
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  });

