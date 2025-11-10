"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { db } from "@/server/db";
import { aiInsights } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateSpeakerNamesSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  speakerNumber: z.number().int().min(0, "Invalid speaker number"),
  speakerName: z
    .string()
    .min(1, "Speaker name is required")
    .max(50, "Speaker name must be 50 characters or less")
    .regex(/^[a-zA-Z0-9\s\-\.]*$/, "Speaker name can only contain letters, numbers, spaces, hyphens, and periods"),
});

export const updateSpeakerNames = authorizedActionClient
  .metadata({ policy: "recordings:write" })
  .schema(updateSpeakerNamesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { recordingId, speakerNumber, speakerName } = parsedInput;

    try {
      // Get the current AI insight for this recording
      const insight = await db.query.aiInsights.findFirst({
        where: eq(aiInsights.recordingId, recordingId),
      });

      if (!insight) {
        return {
          success: false,
          error: "Transcription not found",
        };
      }

      // Update speaker names
      const currentSpeakerNames = (insight.speakerNames as Record<number, string>) || {};
      currentSpeakerNames[speakerNumber] = speakerName;

      await db
        .update(aiInsights)
        .set({
          speakerNames: currentSpeakerNames,
          updatedAt: new Date(),
        })
        .where(eq(aiInsights.id, insight.id));

      // Revalidate the recording detail page
      revalidatePath(`/projects/[projectId]/recordings/[recordingId]`);

      return {
        success: true,
        data: {
          speakerNumber,
          speakerName,
        },
      };
    } catch (error) {
      console.error("Error updating speaker names:", error);
      return {
        success: false,
        error: "Failed to update speaker name",
      };
    }
  });

