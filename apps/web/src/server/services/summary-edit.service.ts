import { err, ok, type Result } from "neverthrow";
import { logger } from "@/lib/logger";
import { ActionErrors, type ActionError } from "@/lib/action-errors";
import { SummaryHistoryQueries } from "../data-access/summary-history.queries";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";

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
    userId: string
  ): Promise<Result<{ success: boolean; versionNumber: number }, ActionError>> {
    try {
      // Get existing summary insight
      const summaryInsightResult = await AIInsightsQueries.getInsightByType(
        input.recordingId,
        "summary"
      );

      if (summaryInsightResult.isErr()) {
        logger.error("Failed to fetch summary insight", {
          component: "SummaryEditService.updateSummary",
          error: summaryInsightResult.error,
          recordingId: input.recordingId,
        });

        return err(
          ActionErrors.internal(
            "Failed to fetch summary",
            new Error(summaryInsightResult.error.message || "Unknown error"),
            "SummaryEditService.updateSummary"
          )
        );
      }

      const summaryInsight = summaryInsightResult.value;

      if (!summaryInsight) {
        return err(
          ActionErrors.badRequest(
            "Summary not found",
            "SummaryEditService.updateSummary"
          )
        );
      }

      // Get the latest version number
      const latestVersionResult =
        await SummaryHistoryQueries.getLatestVersionNumber(input.recordingId);

      if (latestVersionResult.isErr()) {
        logger.error("Failed to get latest version number", {
          component: "SummaryEditService.updateSummary",
          error: latestVersionResult.error,
          recordingId: input.recordingId,
        });

        return err(
          ActionErrors.internal(
            "Failed to get version number",
            latestVersionResult.error,
            "SummaryEditService.updateSummary"
          )
        );
      }

      const newVersion = latestVersionResult.value + 1;

      // Save the current summary as a history entry
      const historyResult = await SummaryHistoryQueries.insertSummaryHistory({
        recordingId: input.recordingId,
        content: summaryInsight.content,
        editedById: userId,
        versionNumber: newVersion,
        changeDescription: input.changeDescription ?? null,
      });

      if (historyResult.isErr()) {
        logger.error("Failed to save summary history", {
          component: "SummaryEditService.updateSummary",
          error: historyResult.error,
          recordingId: input.recordingId,
        });

        return err(
          ActionErrors.internal(
            "Failed to save summary history",
            historyResult.error,
            "SummaryEditService.updateSummary"
          )
        );
      }

      // Update the summary insight with new content and mark as edited
      const updateResult = await AIInsightsQueries.updateInsightWithEdit(
        summaryInsight.id,
        input.content,
        userId
      );

      if (updateResult.isErr()) {
        logger.error("Failed to update summary insight", {
          component: "SummaryEditService.updateSummary",
          error: updateResult.error,
          recordingId: input.recordingId,
        });

        return err(
          ActionErrors.internal(
            "Failed to update summary",
            new Error(updateResult.error),
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
    recordingId: string
  ): Promise<
    Result<
      Array<{
        id: string;
        versionNumber: number;
        content: Record<string, unknown>;
        editedById: string;
        editedAt: Date;
        changeDescription: string | null;
      }>,
      ActionError
    >
  > {
    try {
      const historyResult =
        await SummaryHistoryQueries.selectSummaryHistoryByRecordingId(
          recordingId
        );

      if (historyResult.isErr()) {
        logger.error("Failed to get summary history", {
          component: "SummaryEditService.getSummaryHistory",
          error: historyResult.error,
          recordingId,
        });

        return err(
          ActionErrors.internal(
            "Failed to get summary history",
            historyResult.error,
            "SummaryEditService.getSummaryHistory"
          )
        );
      }

      return ok(historyResult.value);
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

