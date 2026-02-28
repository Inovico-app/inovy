import { CacheInvalidation } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { err, ok } from "neverthrow";
import { start } from "workflow/api";
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
    recordingId: string,
    organizationId: string
  ): Promise<ActionResult<{ canReprocess: boolean; reason?: string }>> {
    try {
      // Get recording
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);

      if (!recording) {
        return ok({
          canReprocess: false,
          reason: "Recording not found",
        });
      }

      // Verify recording belongs to organization
      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "ReprocessingService.canReprocess"
        );
      } catch (error) {
        return ok({
          canReprocess: false,
          reason: "Recording not found",
        });
      }

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
      const isReprocessing =
        await ReprocessingQueries.isRecordingReprocessing(recordingId);

      if (isReprocessing) {
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
          error as Error,
          "ReprocessingService.canReprocess"
        )
      );
    }
  }

  /**
   * Backup current insights before reprocessing
   */
  static async backupCurrentInsights(
    recordingId: string,
    organizationId: string
  ): Promise<
    ActionResult<{
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
    }>
  > {
    try {
      // Get recording for transcription text
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);

      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "ReprocessingService.backupCurrentInsights"
          )
        );
      }

      // Verify recording belongs to organization
      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "ReprocessingService.backupCurrentInsights"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "ReprocessingService.backupCurrentInsights"
          )
        );
      }

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

      if (recording) {
        // Backup transcription if exists
        if (recording.transcriptionText) {
          const transcriptionInsight = await AIInsightsQueries.getInsightByType(
            recordingId,
            "transcription"
          );

          if (transcriptionInsight) {
            backup.transcription = {
              text: recording.transcriptionText,
              utterances: transcriptionInsight.utterances as unknown[],
              insightId: transcriptionInsight.id,
            };
          }
        }
      }

      // Backup summary
      const summaryInsight = await AIInsightsQueries.getInsightByType(
        recordingId,
        "summary"
      );

      if (summaryInsight) {
        backup.summary = {
          content: summaryInsight.content,
          insightId: summaryInsight.id,
        };
      }

      // Backup tasks
      const tasks = await TasksQueries.getTasksByRecordingId(recordingId);

      if (tasks.length > 0) {
        backup.tasks = tasks.map((task) => ({
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
          error as Error,
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
    triggeredById: string,
    organizationId: string
  ): Promise<ActionResult<{ reprocessingId: string }>> {
    try {
      logger.info("Starting reprocessing trigger", {
        component: "ReprocessingService.triggerReprocessing",
        recordingId,
        triggeredById,
      });

      // Verify recording belongs to organization first
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "ReprocessingService.triggerReprocessing"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "ReprocessingService.triggerReprocessing"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "ReprocessingService.triggerReprocessing"
          )
        );
      }

      // Check if can reprocess
      const canReprocessResult = await this.canReprocess(
        recordingId,
        organizationId
      );

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
      const backupResult = await this.backupCurrentInsights(
        recordingId,
        organizationId
      );

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

      const reprocessingHistory =
        await ReprocessingQueries.createReprocessingHistory(historyData);

      // Reset recording statuses and update reprocessing info
      await RecordingsQueries.updateRecording(recordingId, {
        lastReprocessedAt: new Date(),
        reprocessingTriggeredById: triggeredById,
        workflowStatus: "idle",
        workflowError: null,
        transcriptionStatus: "pending",
      });

      CacheInvalidation.invalidateRecording(
        recordingId,
        recording.projectId,
        recording.organizationId
      );

      // Trigger AI processing workflow (fire and forget)
      const workflowRun = await start(convertRecordingIntoAiInsights, [
        recordingId,
        true,
      ]);

      logger.info("AI processing workflow triggered from reprocessing", {
        component: "ReprocessingService.triggerReprocessing",
        recordingId,
        run: {
          id: workflowRun.runId,
          name: workflowRun.workflowName,
          status: workflowRun.status,
        },
      });

      // Update reprocessing history asynchronously when workflow completes
      workflowRun.returnValue
        .then(async (workflowResult) => {
          if (
            workflowResult?.success &&
            workflowResult.value.status === "completed"
          ) {
            await ReprocessingQueries.updateReprocessingHistory(
              reprocessingHistory.id,
              { status: "completed", completedAt: new Date() }
            );
            logger.info("Reprocessing completed successfully", {
              component: "ReprocessingService.triggerReprocessing",
              recordingId,
              reprocessingId: reprocessingHistory.id,
            });
          } else {
            const errorMessage = workflowResult?.success
              ? (workflowResult.value.error ?? "Unknown workflow error")
              : (workflowResult?.error || "Workflow execution failed");
            await ReprocessingQueries.updateReprocessingHistory(
              reprocessingHistory.id,
              { status: "failed", completedAt: new Date(), errorMessage }
            );
            logger.error("Reprocessing workflow failed", {
              component: "ReprocessingService.triggerReprocessing",
              recordingId,
              reprocessingId: reprocessingHistory.id,
              error: errorMessage,
            });
          }
        })
        .catch(async (error: unknown) => {
          const errorMessage =
            error instanceof Error ? error.message : "Workflow execution failed";
          await ReprocessingQueries.updateReprocessingHistory(
            reprocessingHistory.id,
            { status: "failed", completedAt: new Date(), errorMessage }
          );
          logger.error("Reprocessing workflow threw an error", {
            component: "ReprocessingService.triggerReprocessing",
            recordingId,
            reprocessingId: reprocessingHistory.id,
            error,
          });
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
          error as Error,
          "ReprocessingService.triggerReprocessing"
        )
      );
    }
  }

  /**
   * Get reprocessing status for a recording
   */
  static async getReprocessingStatus(
    recordingId: string,
    organizationId: string
  ): Promise<
    ActionResult<{
      isReprocessing: boolean;
      status?: string;
      startedAt?: Date;
      errorMessage?: string | null;
    }>
  > {
    try {
      // Verify recording belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "ReprocessingService.getReprocessingStatus"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "ReprocessingService.getReprocessingStatus"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "ReprocessingService.getReprocessingStatus"
          )
        );
      }

      const latestHistory =
        await ReprocessingQueries.getLatestReprocessingHistory(recordingId);

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
          error as Error,
          "ReprocessingService.getReprocessingStatus"
        )
      );
    }
  }
}

