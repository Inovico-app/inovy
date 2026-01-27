"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightService } from "@/server/services/ai-insight.service";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSpeakerNamesSchema = z.object({
  recordingId: z.uuid("Invalid recording ID"),
  speakerNumber: z.number().int().min(0, "Invalid speaker number"),
  speakerName: z
    .string()
    .min(1, "Speaker name is required")
    .max(50, "Speaker name must be 50 characters or less")
    .regex(
      /^[a-zA-Z0-9\s\-.]*$/,
      "Speaker name can only contain letters, numbers, spaces, hyphens, and periods"
    ),
  userId: z.string().optional().nullable(),
});

export const updateSpeakerNames = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:update") })
  .inputSchema(updateSpeakerNamesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, speakerNumber, speakerName, userId } = parsedInput;
    const { organizationId } = ctx;

    if (!organizationId) {
      return {
        success: false,
        error: "Organization context required",
      };
    }

    try {
      // Get the current speaker names
      const insightResult = await AIInsightService.getInsightByTypeInternal(
        recordingId,
        "transcription"
      );

      if (insightResult.isErr()) {
        return {
          success: false,
          error: "Failed to get transcription",
        };
      }

      const insight = insightResult.value;
      if (!insight) {
        return {
          success: false,
          error: "Transcription not found",
        };
      }

      // Update speaker names (create new object to avoid mutation)
      const currentSpeakerNames = {
        ...((insight.speakerNames as Record<string, string>) || {}),
        [speakerNumber.toString()]: speakerName,
      };

      // Update speaker user IDs (create new object to avoid mutation)
      const currentSpeakerUserIds = {
        ...((insight.speakerUserIds as Record<string, string>) || {}),
      };

      if (userId === null || userId === undefined || userId === "") {
        // Remove user link if userId is null/empty
        delete currentSpeakerUserIds[speakerNumber.toString()];
      } else {
        // Set user link if userId is provided
        currentSpeakerUserIds[speakerNumber.toString()] = userId;
      }

      // Update via service
      const updateResult = await AIInsightService.updateSpeakerNames(
        recordingId,
        currentSpeakerNames,
        organizationId,
        currentSpeakerUserIds
      );

      if (updateResult.isErr()) {
        return {
          success: false,
          error: "Failed to update speaker name",
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
          speakerNumber,
          speakerName,
        },
      };
    } catch (error) {
      logger.error(
        "Error updating speaker names",
        { recordingId, speakerNumber, speakerName },
        error as Error
      );
      return {
        success: false,
        error: "Failed to update speaker name",
      };
    }
  });

