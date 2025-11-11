"use server";

import { z } from "zod";
import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { db } from "@/server/db";
import { recordings, aiInsights } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

const createGmailDraftSchema = z.object({
  recordingId: z.string().uuid(),
  subject: z.string().optional(),
  additionalContent: z.string().optional(),
});

type CreateGmailDraftInput = z.infer<typeof createGmailDraftSchema>;

/**
 * Server action to create a Gmail draft from a recording summary
 */
export async function createGmailDraft(
  input: CreateGmailDraftInput
): Promise<{
  success: boolean;
  data?: {
    draftId: string;
    draftUrl: string;
  };
  error?: string;
}> {
  try {
    // Validate input
    const validatedData = createGmailDraftSchema.parse(input);

    // Get current user session
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      logger.error("Failed to get user session in createGmailDraft", {
        error: sessionResult.isErr() ? sessionResult.error : "No user found",
      });
      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const user = sessionResult.value.user;

    // Check if user has Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      return {
        success: false,
        error: "Google account not connected. Please connect in settings first.",
      };
    }

    // Get the recording
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, validatedData.recordingId))
      .limit(1);

    if (!recording) {
      return {
        success: false,
        error: "Recording not found",
      };
    }

    // Verify recording belongs to user's organization
    if (recording.organizationId !== user.organization_code) {
      return {
        success: false,
        error: "Unauthorized access to recording",
      };
    }

    // Get the summary from ai_insights
    const [summaryInsight] = await db
      .select()
      .from(aiInsights)
      .where(
        and(
          eq(aiInsights.recordingId, recording.id),
          eq(aiInsights.insightType, "summary")
        )
      )
      .limit(1);

    if (!summaryInsight || !summaryInsight.content) {
      return {
        success: false,
        error: "Recording does not have a summary yet",
      };
    }

    const summaryText = typeof summaryInsight.content === 'string' 
      ? summaryInsight.content 
      : JSON.stringify(summaryInsight.content);

    logger.info("Creating Gmail draft from recording", {
      userId: user.id,
      recordingId: recording.id,
    });

    // Create Gmail draft
    const result = await GoogleGmailService.createDraftFromSummary(
      user.id,
      recording,
      summaryText,
      {
        subject: validatedData.subject,
        additionalContent: validatedData.additionalContent,
      }
    );

    if (result.isErr()) {
      logger.error("Failed to create Gmail draft", {
        userId: user.id,
        recordingId: recording.id,
        error: result.error.message,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    logger.info("Successfully created Gmail draft", {
      userId: user.id,
      recordingId: recording.id,
      draftId: result.value.draftId,
    });

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      logger.warn("Validation error in createGmailDraft", {
        field: firstIssue.path.join("."),
        message: firstIssue.message,
      });

      return {
        success: false,
        error: firstIssue.message,
      };
    }

    logger.error("Unexpected error in createGmailDraft", {}, error as Error);

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

