"use server";

import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { db } from "@/server/db";
import { aiInsights } from "@/server/db/schema/ai-insights";
import { recordings } from "@/server/db/schema/recordings";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const createGmailDraftSchema = z.object({
  recordingId: z.string().uuid(),
  subject: z.string().optional(),
  additionalContent: z.string().optional(),
});

/**
 * Server action to create a Gmail draft from a recording summary
 */
export const createGmailDraft = authorizedActionClient
  .metadata({ permissions: policyToPermissions("recordings:update") })
  .schema(createGmailDraftSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user has Google connection with gmail scope
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest(
        "Google account not connected. Please connect in settings first."
      );
    }

    const hasScopeResult = await GoogleOAuthService.hasScopes(user.id, "gmail");

    if (hasScopeResult.isErr()) {
      throw ActionErrors.internal(
        "Failed to verify Gmail scopes",
        hasScopeResult.error,
        "createGmailDraft"
      );
    }

    if (!hasScopeResult.value) {
      throw ActionErrors.badRequest(
        "Missing permission: Gmail (create drafts). Please grant this permission in Settings > Integrations."
      );
    }

    // Get the recording
    const [recording] = await db
      .select()
      .from(recordings)
      .where(eq(recordings.id, parsedInput.recordingId))
      .limit(1);

    if (!recording) {
      throw ActionErrors.notFound("Recording", "create-gmail-draft");
    }

    // Verify recording belongs to user's organization using centralized helper
    try {
      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "createGmailDraft"
      );
    } catch (error) {
      throw ActionErrors.notFound("Recording", "create-gmail-draft");
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
      throw ActionErrors.badRequest("Recording does not have a summary yet");
    }

    const summaryText =
      typeof summaryInsight.content === "string"
        ? summaryInsight.content
        : JSON.stringify(summaryInsight.content);

    logger.info("Creating Gmail draft from recording", {
      userId: user.id,
      recordingId: recording.id,
    });

    // Create Gmail draft
    const result = await GoogleGmailService.createDraftFromSummary(
      user.id,
      organizationId,
      recording,
      summaryText,
      {
        subject: parsedInput.subject,
        additionalContent: parsedInput.additionalContent,
      }
    );

    if (result.isErr()) {
      logger.error("Failed to create Gmail draft", {
        userId: user.id,
        recordingId: recording.id,
        error: result.error.message,
      });

      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "create-gmail-draft"
      );
    }

    logger.info("Successfully created Gmail draft", {
      userId: user.id,
      recordingId: recording.id,
      draftId: result.value.draftId,
    });

    return result.value;
  });

