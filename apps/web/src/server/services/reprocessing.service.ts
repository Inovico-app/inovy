import { ActionErrors, type ActionError } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { err, ok, type Result } from "neverthrow";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { ReprocessingQueries } from "../data-access/reprocessing.queries";
import { TasksQueries } from "../data-access/tasks.queries";
import type { NewReprocessingHistory } from "../db/schema/reprocessing-history";

/**
 * Reprocessing Service
 * Handles business logic for reprocessing AI insights
 */
export class ReprocessingService {
  /**
   * Check if a recording can be reprocessed
   */
  static async canReprocess(
    recordingId: string
  ): Promise<Result<{ canReprocess: boolean; reason?: string }, ActionError>> {
    try {
      // Get recording
      const recordingResult = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      if (recordingResult.isErr() || !recordingResult.value) {
        return ok({
          canReprocess: false,
          reason: "Recording not found",
        });
      }

      const recording = recordingResult.value;

      // Check if recording has a valid file
      if (!recording.fileUrl) {
        return ok({
          canReprocess: false,
          reason: "Recording has no file",
        });
      }

      // Check if recording is archived
      if (recording.status === "archived") {
        return ok({
          canReprocess: false,
          reason: "Cannot reprocess archived recordings",
        });
      }

      // Check if workflow is currently running
      if (recording.workflowStatus === "running") {
        return ok({
          canReprocess: false,
          reason: "Recording is currently being processed",
        });
      }

      // Check if there's an active reprocessing
      const isReprocessingResult =
        await ReprocessingQueries.isRecordingReprocessing(recordingId);

      if (isReprocessingResult.isErr()) {
        logger.error("Failed to check reprocessing status", {
          component: "ReprocessingService.canReprocess",
          recordingId,
          error: isReprocessingResult.error,
        });
        return err(
          ActionErrors.internal(
            "Failed to check reprocessing status",
            isReprocessingResult.error,
            "ReprocessingService.canReprocess"
          )
        );
      }

      if (isReprocessingResult.value) {
        return ok({
          canReprocess: false,
          reason: "Recording is already being reprocessed",
        });
      }

      return ok({ canReprocess: true });
    } catch (error) {
      logger.error("Failed to check if can reprocess", {
        component: "ReprocessingService.canReprocess",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to check reprocessing eligibility",
          error instanceof Error ? error : new Error("Unknown error"),
          "ReprocessingService.canReprocess"
        )
      );
    }
  }

  /**
   * Backup current insights before reprocessing
   */
  static async backupCurrentInsights(recordingId: string): Promise<
    Result<
      {
        transcription?: {
          text: string;
          utterances?: unknown[];
          insightId: string;
        };
        summary?: {
          content: Record<string, unknown>;
          insightId: string;
        };
        tasks?: Array<{
          id: string;
          title: string;
          description: string | null;
          priority: string;
          status: string;
          assigneeId: string | null;
          assigneeName: string | null;
          dueDate: Date | null;
          confidenceScore: number | null;
          meetingTimestamp: number | null;
        }>;
      },
      ActionError
    >
  > {
    try {
      const backup: {
        transcription?: {
          text: string;
          utterances?: unknown[];
          insightId: string;
        };
        summary?: {
          content: Record<string, unknown>;
          insightId: string;
        };
        tasks?: Array<{
          id: string;
          title: string;
          description: string | null;
          priority: string;
          status: string;
          assigneeId: string | null;
          assigneeName: string | null;
          dueDate: Date | null;
          confidenceScore: number | null;
          meetingTimestamp: number | null;
        }>;
      } = {};

      // Get recording for transcription text
      const recordingResult = await RecordingsQueries.selectRecordingById(
        recordingId
      );

      if (recordingResult.isOk() && recordingResult.value) {
        const recording = recordingResult.value;

        // Backup transcription if exists
        if (recording.transcriptionText) {
          const transcriptionInsightResult =
            await AIInsightsQueries.getInsightByType(
              recordingId,
              "transcription"
            );

          if (
            transcriptionInsightResult.isOk() &&
            transcriptionInsightResult.value
          ) {
            const transcriptionInsight = transcriptionInsightResult.value;
            backup.transcription = {
              text: recording.transcriptionText,
              utterances: transcriptionInsight.utterances as unknown[],
              insightId: transcriptionInsight.id,
            };
          }
        }
      }

      // Backup summary
      const summaryInsightResult = await AIInsightsQueries.getInsightByType(
        recordingId,
        "summary"
      );

      if (summaryInsightResult.isOk() && summaryInsightResult.value) {
        const summaryInsight = summaryInsightResult.value;
        backup.summary = {
          content: summaryInsight.content,
          insightId: summaryInsight.id,
        };
      }

      // Backup tasks
      const tasksResult = await TasksQueries.getTasksByRecordingId(recordingId);

      if (tasksResult.isOk() && tasksResult.value.length > 0) {
        backup.tasks = tasksResult.value.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assigneeId: task.assigneeId,
          assigneeName: task.assigneeName,
          dueDate: task.dueDate,
          confidenceScore: task.confidenceScore,
          meetingTimestamp: task.meetingTimestamp,
        }));
      }

      logger.info("Successfully backed up insights", {
        component: "ReprocessingService.backupCurrentInsights",
        recordingId,
        hasTranscription: !!backup.transcription,
        hasSummary: !!backup.summary,
        tasksCount: backup.tasks?.length ?? 0,
      });

      return ok(backup);
    } catch (error) {
      logger.error("Failed to backup insights", {
        component: "ReprocessingService.backupCurrentInsights",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to backup current insights",
          error instanceof Error ? error : new Error("Unknown error"),
          "ReprocessingService.backupCurrentInsights"
        )
      );
    }
  }

  /**
   * Trigger reprocessing of AI insights
   */
  static async triggerReprocessing(
    recordingId: string,
    triggeredById: string
  ): Promise<Result<{ reprocessingId: string }, ActionError>> {
    try {
      logger.info("Starting reprocessing trigger", {
        component: "ReprocessingService.triggerReprocessing",
        recordingId,
        triggeredById,
      });

      // Check if can reprocess
      const canReprocessResult = await this.canReprocess(recordingId);

      if (canReprocessResult.isErr()) {
        return err(canReprocessResult.error);
      }

      if (!canReprocessResult.value.canReprocess) {
        return err(
          ActionErrors.badRequest(
            canReprocessResult.value.reason ?? "Cannot reprocess recording",
            "ReprocessingService.triggerReprocessing"
          )
        );
      }

      // Backup current insights
      const backupResult = await this.backupCurrentInsights(recordingId);

      if (backupResult.isErr()) {
        return err(backupResult.error);
      }

      // Create reprocessing history record
      const historyData: NewReprocessingHistory = {
        recordingId,
        triggeredById,
        status: "running",
        backupData: backupResult.value,
      };

      const historyResult = await ReprocessingQueries.createReprocessingHistory(
        historyData
      );

      if (historyResult.isErr()) {
        logger.error("Failed to create reprocessing history", {
          component: "ReprocessingService.triggerReprocessing",
          recordingId,
          error: historyResult.error,
        });
        return err(
          ActionErrors.internal(
            "Failed to create reprocessing history",
            historyResult.error,
            "ReprocessingService.triggerReprocessing"
          )
        );
      }

      const reprocessingHistory = historyResult.value;

      // Update recording with reprocessing info
      await RecordingsQueries.updateRecording(recordingId, {
        lastReprocessedAt: new Date(),
        reprocessingTriggeredById: triggeredById,
      });

      // Trigger the AI workflow (fire and forget with error handling)
      convertRecordingIntoAiInsights(recordingId, true).then(async (result) => {
        if (result && result.success && result.value.status === "completed") {
          // Update reprocessing history to completed
          await ReprocessingQueries.updateReprocessingHistory(
            reprocessingHistory.id,
            {
              status: "completed",
              completedAt: new Date(),
            }
          );

          logger.info("Reprocessing completed successfully", {
            component: "ReprocessingService.triggerReprocessing",
            recordingId,
            reprocessingId: reprocessingHistory.id,
          });
        } else {
          // Update reprocessing history to failed
          const errorMessage = result?.success
            ? result.value.error || "Unknown workflow error"
            : result?.error || "Workflow execution failed";

          await ReprocessingQueries.updateReprocessingHistory(
            reprocessingHistory.id,
            {
              status: "failed",
              completedAt: new Date(),
              errorMessage,
            }
          );

          logger.error("Reprocessing failed", {
            component: "ReprocessingService.triggerReprocessing",
            recordingId,
            reprocessingId: reprocessingHistory.id,
            error: errorMessage,
          });
        }
      });

      logger.info("Reprocessing triggered successfully", {
        component: "ReprocessingService.triggerReprocessing",
        recordingId,
        reprocessingId: reprocessingHistory.id,
      });

      return ok({ reprocessingId: reprocessingHistory.id });
    } catch (error) {
      logger.error("Failed to trigger reprocessing", {
        component: "ReprocessingService.triggerReprocessing",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to trigger reprocessing",
          error instanceof Error ? error : new Error("Unknown error"),
          "ReprocessingService.triggerReprocessing"
        )
      );
    }
  }

  /**
   * Get reprocessing status for a recording
   */
  static async getReprocessingStatus(recordingId: string): Promise<
    Result<
      {
        isReprocessing: boolean;
        status?: string;
        startedAt?: Date;
        errorMessage?: string | null;
      },
      ActionError
    >
  > {
    try {
      const latestHistoryResult =
        await ReprocessingQueries.getLatestReprocessingHistory(recordingId);

      if (latestHistoryResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get reprocessing status",
            latestHistoryResult.error,
            "ReprocessingService.getReprocessingStatus"
          )
        );
      }

      const latestHistory = latestHistoryResult.value;

      if (!latestHistory) {
        return ok({ isReprocessing: false });
      }

      const isReprocessing =
        latestHistory.status === "running" ||
        latestHistory.status === "pending";

      return ok({
        isReprocessing,
        status: latestHistory.status,
        startedAt: latestHistory.startedAt,
        errorMessage: latestHistory.errorMessage,
      });
    } catch (error) {
      logger.error("Failed to get reprocessing status", {
        component: "ReprocessingService.getReprocessingStatus",
        recordingId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get reprocessing status",
          error instanceof Error ? error : new Error("Unknown error"),
          "ReprocessingService.getReprocessingStatus"
        )
      );
    }
  }
}

