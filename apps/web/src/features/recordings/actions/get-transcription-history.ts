"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/action-client";
import { TranscriptionEditService } from "@/server/services";

const getTranscriptionHistorySchema = z.object({
  recordingId: z.string().uuid(),
});

/**
 * Server action to get transcription version history
 */
export const getTranscriptionHistory = authorizedActionClient
  .metadata({ policy: "recordings:read" })
  .schema(getTranscriptionHistorySchema)
  .action(
    async ({ parsedInput }: { parsedInput: { recordingId: string } }) => {
      const result = await TranscriptionEditService.getTranscriptionHistory(
        parsedInput.recordingId
      );

      if (result.isErr()) {
        throw new Error(result.error.message);
      }

      return result.value;
    }
  );

