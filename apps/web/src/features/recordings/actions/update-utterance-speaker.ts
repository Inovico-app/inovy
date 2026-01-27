"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightService } from "@/server/services/ai-insight.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateUtteranceSpeakerSchema = z.object({
  recordingId: z.uuid("Invalid recording ID"),
  utteranceIndex: z.number().int().min(0, "Invalid utterance index"),
  newSpeaker: z.number().int().min(0, "Invalid speaker number"),
});

export const updateUtteranceSpeaker = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:update") })
  .inputSchema(updateUtteranceSpeakerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, utteranceIndex, newSpeaker } = parsedInput;
    const { organizationId, user } = ctx;

    if (!organizationId) {
      return {
        success: false,
        error: "Organization context required",
      };
    }

    if (!user) {
      return {
        success: false,
        error: "User context required",
      };
    }

    try {
      const updateResult = await AIInsightService.updateUtteranceSpeaker(
        recordingId,
        utteranceIndex,
        newSpeaker,
        user.id,
        organizationId
      );

      if (updateResult.isErr()) {
        return {
          success: false,
          error:
            updateResult.error.message || "Failed to update utterance speaker",
        };
      }

      // Get projectId from the recording to revalidate the correct path
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);

      if (recording) {
        revalidatePath(
          `/projects/${recording.projectId}/recordings/${recordingId}`
        );
      }

      return {
        success: true,
        data: {
          utteranceIndex,
          newSpeaker,
        },
      };
    } catch (error) {
      logger.error(
        "Error updating utterance speaker",
        { recordingId, utteranceIndex, newSpeaker },
        error as Error
      );
      return {
        success: false,
        error: "Failed to update utterance speaker",
      };
    }
  });
