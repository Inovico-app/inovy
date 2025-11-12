import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { SummaryHistoryQueries } from "../data-access/summary-history.queries";

export interface UpdateSummaryInput {
  recordingId: string;
  content: Record<string, unknown>;
  changeDescription?: string;
}

/**
 * Service for editing AI-generated summaries
 */
export class SummaryEditService {
  /**
   * Update summary content with version history tracking
   */
  static async updateSummary(
    input: UpdateSummaryInput,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<{ success: boolean; versionNumber: number }>> {
    try {
      // Verify recording belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(
        input.recordingId
      );
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "SummaryEditService.updateSummary"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "SummaryEditService.updateSummary"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "SummaryEditService.updateSummary"
          )
        );
      }

      // Get existing summary insight
      const summaryInsight = await AIInsightsQueries.getInsightByType(
        input.recordingId,
        "summary"
      );

      if (!summaryInsight) {
        return err(
          ActionErrors.notFound(
            "Summary",
            "SummaryEditService.updateSummary"
          )
        );
      }

      // Get the latest version number
      const latestVersion = await SummaryHistoryQueries.getLatestVersionNumber(
        input.recordingId
      );
      const newVersion = latestVersion + 1;

      // Save the current summary as a history entry
      await SummaryHistoryQueries.insertSummaryHistory({
        recordingId: input.recordingId,
        content: summaryInsight.content,
        editedById: userId,
        versionNumber: newVersion,
        changeDescription: input.changeDescription ?? null,
      });

      // Update the summary insight with new content and mark as edited
      const updated = await AIInsightsQueries.updateInsightWithEdit(
        summaryInsight.id,
        input.content,
        userId
      );

      if (!updated) {
        return err(
          ActionErrors.internal(
            "Failed to update summary",
            undefined,
            "SummaryEditService.updateSummary"
          )
        );
      }

      logger.info("Successfully updated summary", {
        component: "SummaryEditService.updateSummary",
        recordingId: input.recordingId,
        versionNumber: newVersion,
      });

      return ok({ success: true, versionNumber: newVersion });
    } catch (error) {
      logger.error("Unexpected error updating summary", {
        component: "SummaryEditService.updateSummary",
        error,
      });

      return err(
        ActionErrors.internal(
          "Unexpected error updating summary",
          error as Error,
          "SummaryEditService.updateSummary"
        )
      );
    }
  }

  /**
   * Get summary version history for a recording
   */
  static async getSummaryHistory(
    recordingId: string,
    organizationId: string
  ): Promise<
    ActionResult<
      Array<{
        id: string;
        versionNumber: number;
        content: Record<string, unknown>;
        editedById: string;
        editedAt: Date;
        changeDescription: string | null;
      }>
    >
  > {
    try {
      // Verify recording belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "SummaryEditService.getSummaryHistory"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "SummaryEditService.getSummaryHistory"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "SummaryEditService.getSummaryHistory"
          )
        );
      }

      const history =
        await SummaryHistoryQueries.selectSummaryHistoryByRecordingId(
          recordingId
        );

      return ok(history);
    } catch (error) {
      logger.error("Unexpected error getting summary history", {
        component: "SummaryEditService.getSummaryHistory",
        error,
      });

      return err(
        ActionErrors.internal(
          "Unexpected error getting summary history",
          error as Error,
          "SummaryEditService.getSummaryHistory"
        )
      );
    }
  }
}
