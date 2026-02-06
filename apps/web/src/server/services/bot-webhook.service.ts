import { put } from "@vercel/blob";
import { err, ok } from "neverthrow";
import { start } from "workflow/api";
import { logger, serializeError } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { convertRecordingIntoAiInsights } from "../../workflows/convert-recording";
import { BotSessionsQueries } from "../data-access/bot-sessions.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { type BotStatus } from "../db/schema/bot-sessions";
import type {
  BotRecordingReadyEvent,
  BotStatusChangeEvent,
} from "../validation/bot/recall-webhook.schema";
import { mapRecallStatusToBotStatus } from "./bot-providers/recall/status-mapper";
import { RecordingService } from "./recording.service";

/**
 * Bot Webhook Service
 * Handles processing of Recall.ai webhook events
 */
export class BotWebhookService {
  /**
   * Process bot status change event
   */
  static async processStatusChange(
    event: BotStatusChangeEvent
  ): Promise<ActionResult<void>> {
    try {
      const { bot, custom_metadata } = event;
      const organizationId = custom_metadata?.organizationId as
        | string
        | undefined;

      if (!organizationId || typeof organizationId !== "string") {
        logger.warn("Status change event missing organizationId", {
          component: "BotWebhookService.processStatusChange",
          botId: bot.id,
        });
        return ok(undefined);
      }

      // Find existing session to check current state
      const existingSession = await BotSessionsQueries.findByRecallBotId(
        bot.id,
        organizationId
      );

      if (!existingSession) {
        logger.warn("Bot session not found for status update", {
          component: "BotWebhookService.processStatusChange",
          botId: bot.id,
          organizationId,
        });
        return ok(undefined);
      }

      // Map Recall.ai status to internal BotStatus
      const internalStatus = mapRecallStatusToBotStatus(bot.status);

      // Prepare updates
      const updates: Partial<{
        recallStatus: string;
        botStatus: BotStatus;
        joinedAt: Date | null;
        leftAt: Date | null;
        error: string | null;
      }> = {
        recallStatus: bot.status,
        botStatus: internalStatus,
      };

      // Set joinedAt when bot becomes active (if not already set)
      if (internalStatus === "active" && !existingSession.joinedAt) {
        updates.joinedAt = new Date();
      }

      // Set leftAt when bot leaves or completes (if not already set)
      if (
        (internalStatus === "leaving" || internalStatus === "completed") &&
        !existingSession.leftAt
      ) {
        updates.leftAt = new Date();
      }

      // Handle failures
      if (internalStatus === "failed") {
        updates.error = `Bot failed: ${bot.status}`;
      }

      // Update bot session status
      const session = await BotSessionsQueries.updateByRecallBotId(
        bot.id,
        organizationId,
        updates
      );

      if (!session) {
        logger.warn("Failed to update bot session", {
          component: "BotWebhookService.processStatusChange",
          botId: bot.id,
          organizationId,
        });
        return ok(undefined);
      }

      logger.info("Updated bot session status", {
        component: "BotWebhookService.processStatusChange",
        sessionId: session.id,
        botId: bot.id,
        recallStatus: bot.status,
        botStatus: internalStatus,
        joinedAt: updates.joinedAt,
        leftAt: updates.leftAt,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process status change event", {
        component: "BotWebhookService.processStatusChange",
        error: serializeError(error),
        botId: event.bot.id,
      });

      return err(
        ActionErrors.internal(
          "Failed to process status change",
          error as Error,
          "BotWebhookService.processStatusChange"
        )
      );
    }
  }

  /**
   * Process bot recording ready event
   * Downloads recording, uploads to Vercel Blob, creates Recording entry, and triggers workflow
   */
  static async processRecordingReady(
    event: BotRecordingReadyEvent
  ): Promise<ActionResult<void>> {
    try {
      const { bot, recording, meeting, custom_metadata } = event;
      const projectId = custom_metadata?.projectId as string | undefined;
      const organizationId = custom_metadata?.organizationId as
        | string
        | undefined;
      const userId = custom_metadata?.userId as string | undefined;

      if (
        !projectId ||
        !organizationId ||
        !userId ||
        typeof projectId !== "string" ||
        typeof organizationId !== "string" ||
        typeof userId !== "string"
      ) {
        logger.error("Recording ready event missing required metadata", {
          component: "BotWebhookService.processRecordingReady",
          botId: bot.id,
          custom_metadata,
        });

        return err(
          ActionErrors.internal(
            "Missing required metadata in webhook event",
            undefined,
            "BotWebhookService.processRecordingReady"
          )
        );
      }

      // Find bot session
      const session = await BotSessionsQueries.findByRecallBotId(
        bot.id,
        organizationId
      );

      if (!session) {
        logger.error("Bot session not found for recording", {
          component: "BotWebhookService.processRecordingReady",
          botId: bot.id,
          organizationId,
        });

        return err(
          ActionErrors.internal(
            "Bot session not found",
            undefined,
            "BotWebhookService.processRecordingReady"
          )
        );
      }

      logger.info("Processing recording ready event", {
        component: "BotWebhookService.processRecordingReady",
        botId: bot.id,
        recordingId: recording.id,
        projectId,
      });

      // Check if recording already exists by externalRecordingId (idempotency)
      const existingRecording =
        await RecordingsQueries.selectRecordingByExternalId(
          recording.id,
          organizationId
        );

      let finalRecordingId: string;

      if (existingRecording) {
        // Recording already exists, use it
        logger.info("Recording already exists with external ID", {
          component: "BotWebhookService.processRecordingReady",
          recordingId: existingRecording.id,
          externalRecordingId: recording.id,
          sessionId: session.id,
        });
        finalRecordingId = existingRecording.id;
      } else {
        // Download recording from Recall.ai
        const downloadResult = await this.downloadRecording(recording.url);

        if (downloadResult.isErr()) {
          return err(downloadResult.error);
        }

        const { fileBuffer, mimeType } = downloadResult.value;

        // Determine file name
        const fileName = `recall-${recording.id}.${this.getFileExtension(
          mimeType
        )}`;
        const timestamp = Date.now();
        const blobPath = `recordings/${timestamp}-${fileName}`;

        // Upload to Vercel Blob
        const blob = await put(blobPath, fileBuffer, {
          access: "public",
          contentType: mimeType,
        });

        logger.info("Recording uploaded to Vercel Blob", {
          component: "BotWebhookService.processRecordingReady",
          blobUrl: blob.url,
          fileName,
        });

        // Create Recording entry with externalRecordingId
        const recordingDate = meeting?.start_time
          ? new Date(meeting.start_time)
          : new Date();

        const createResult = await RecordingService.createRecording(
          {
            projectId: projectId as string,
            title: meeting?.title ?? session.meetingTitle ?? "Bot Recording",
            description: null,
            fileUrl: blob.url,
            fileName,
            fileSize: fileBuffer.length,
            fileMimeType: mimeType,
            duration: recording.duration ?? null,
            recordingDate,
            recordingMode: "bot",
            transcriptionStatus: "pending",
            transcriptionText: null,
            organizationId: organizationId as string,
            createdById: userId as string,
            externalRecordingId: recording.id, // Use Recall.ai's stable recording.id
          },
          true // Don't invalidate cache yet
        );

        if (createResult.isErr()) {
          logger.error("Failed to create recording", {
            component: "BotWebhookService.processRecordingReady",
            error: createResult.error,
          });
          return err(createResult.error);
        }

        finalRecordingId = createResult.value.id;
      }

      // Update bot session with recording ID
      const updatedSession = await BotSessionsQueries.updateRecordingId(
        bot.id,
        organizationId,
        finalRecordingId,
        bot.status
      );

      if (!updatedSession) {
        logger.error("Failed to update bot session with recording ID", {
          component: "BotWebhookService.processRecordingReady",
          botId: bot.id,
          organizationId,
          recordingId: finalRecordingId,
        });
        return err(
          ActionErrors.internal(
            "Failed to update bot session",
            undefined,
            "BotWebhookService.processRecordingReady"
          )
        );
      }

      logger.info("Recording processed and bot session updated", {
        component: "BotWebhookService.processRecordingReady",
        recordingId: finalRecordingId,
        sessionId: session.id,
        externalRecordingId: recording.id,
      });

      // Trigger AI processing workflow
      const workflowRun = await start(convertRecordingIntoAiInsights, [
        finalRecordingId,
      ]).catch((error) => {
        logger.error("Failed to trigger AI processing workflow", {
          component: "BotWebhookService.processRecordingReady",
          recordingId: finalRecordingId,
          error: serializeError(error),
        });
      });

      if (workflowRun) {
        logger.info("AI processing workflow triggered", {
          component: "BotWebhookService.processRecordingReady",
          recordingId: finalRecordingId,
          workflowRunId: workflowRun.runId,
        });
      }

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process recording ready event", {
        component: "BotWebhookService.processRecordingReady",
        error: serializeError(error),
        botId: event.bot.id,
      });

      return err(
        ActionErrors.internal(
          "Failed to process recording",
          error as Error,
          "BotWebhookService.processRecordingReady"
        )
      );
    }
  }

  /**
   * Download recording file from Recall.ai URL
   */
  private static async downloadRecording(
    url: string
  ): Promise<ActionResult<{ fileBuffer: Buffer; mimeType: string }>> {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return err(
          ActionErrors.internal(
            `Failed to download recording: ${response.statusText}`,
            undefined,
            "BotWebhookService.downloadRecording"
          )
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get("content-type") ?? "video/mp4";

      return ok({ fileBuffer, mimeType });
    } catch (error) {
      return err(
        ActionErrors.internal(
          "Failed to download recording file",
          error as Error,
          "BotWebhookService.downloadRecording"
        )
      );
    }
  }

  /**
   * Get file extension from MIME type
   */
  private static getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/mp3": "mp3",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/m4a": "m4a",
    };

    return mimeToExt[mimeType] || "mp4";
  }
}

