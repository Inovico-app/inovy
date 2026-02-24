import { encrypt, generateEncryptionMetadata } from "@/lib/encryption";
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
import { RecallApiService } from "./recall-api.service";
import { mapRecallEventToBotStatus, mapRecallStatusToBotStatus } from "./bot-providers/recall/status-mapper";
import { RecordingService } from "./recording.service";
import type {
  BotRecordingReadyEvent,
  BotStatusChangeEvent,
  RecallWebhookEvent,
  SvixBotStatusEvent,
  SvixRecordingEvent,
} from "../validation/bot/recall-webhook.schema";

function getMetadata(payload: RecallWebhookEvent): Record<string, string> | undefined {
  if ("data" in payload && payload.data?.bot?.metadata) {
    const meta = payload.data.bot.metadata;
    if (meta && typeof meta === "object") {
      return Object.fromEntries(
        Object.entries(meta).filter(
          (v): v is [string, string] => typeof v[1] === "string"
        )
      ) as Record<string, string>;
    }
  }
  if ("custom_metadata" in payload) return payload.custom_metadata;
  return undefined;
}

export function getBotId(payload: RecallWebhookEvent): string {
  if ("data" in payload && payload.data?.bot) return payload.data.bot.id;
  if ("bot" in payload) return payload.bot.id;
  return "";
}

function getRecallStatus(payload: RecallWebhookEvent): string {
  if ("bot" in payload && "status" in payload.bot) return payload.bot.status;
  if ("data" in payload && payload.data?.data?.code) return payload.data.data.code;
  return "";
}

/**
 * Bot Webhook Service
 * Handles processing of Recall.ai webhook events (Svix and legacy formats)
 */
export class BotWebhookService {
  /**
   * Process bot status change event (Svix or legacy format)
   */
  static async processStatusChange(
    event: SvixBotStatusEvent | BotStatusChangeEvent
  ): Promise<ActionResult<void>> {
    try {
      const botId = getBotId(event);
      const metadata = getMetadata(event);
      const organizationId = metadata?.organizationId;

      if (!organizationId || typeof organizationId !== "string") {
        logger.warn("Status change event missing organizationId", {
          component: "BotWebhookService.processStatusChange",
          botId,
        });
        return ok(undefined);
      }

      const existingSession = await BotSessionsQueries.findByRecallBotId(
        botId,
        organizationId
      );

      if (!existingSession) {
        logger.warn("Bot session not found for status update", {
          component: "BotWebhookService.processStatusChange",
          botId,
          organizationId,
        });
        return ok(undefined);
      }

      const eventType = event.event;
      const internalStatus =
        eventType.startsWith("bot.") && eventType !== "bot.status_change"
          ? mapRecallEventToBotStatus(eventType)
          : mapRecallStatusToBotStatus(getRecallStatus(event));

      const updates: Partial<{
        recallStatus: string;
        botStatus: BotStatus;
        joinedAt: Date | null;
        leftAt: Date | null;
        error: string | null;
      }> = {
        recallStatus: getRecallStatus(event) || eventType,
        botStatus: internalStatus,
      };

      if (internalStatus === "active" && !existingSession.joinedAt) {
        updates.joinedAt = new Date();
      }

      if (
        (internalStatus === "leaving" || internalStatus === "completed") &&
        !existingSession.leftAt
      ) {
        updates.leftAt = new Date();
      }

      if (internalStatus === "failed") {
        const subCode =
          "data" in event && event.data?.data?.sub_code
            ? String(event.data.data.sub_code)
            : "";
        updates.error = subCode
          ? `Bot failed: ${eventType} (sub_code: ${subCode})`
          : `Bot failed: ${eventType}`;
      }

      if (internalStatus === "pending_consent") {
        const subCode =
          "data" in event && event.data?.data?.sub_code
            ? String(event.data.data.sub_code)
            : "";
        if (subCode) {
          updates.error = `Recording permission denied (sub_code: ${subCode})`;
        }
      }

      const session = await BotSessionsQueries.updateByRecallBotId(
        botId,
        organizationId,
        updates
      );

      if (!session) {
        logger.warn("Failed to update bot session", {
          component: "BotWebhookService.processStatusChange",
          botId,
          organizationId,
        });
        return ok(undefined);
      }

      logger.info("Updated bot session status", {
        component: "BotWebhookService.processStatusChange",
        sessionId: session.id,
        botId,
        recallStatus: updates.recallStatus,
        botStatus: internalStatus,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process status change event", {
        component: "BotWebhookService.processStatusChange",
        error: serializeError(error),
        botId: getBotId(event),
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
   * Process recording.done (Svix format) - no URL in payload, fetch via API
   */
  static async processRecordingDone(
    event: SvixRecordingEvent
  ): Promise<ActionResult<void>> {
    try {
      const { recording, bot } = event.data;
      const metadata = getMetadata(event);
      const projectId = metadata?.projectId;
      const organizationId = metadata?.organizationId;
      const userId = metadata?.userId;

      if (
        !projectId ||
        !organizationId ||
        !userId ||
        typeof projectId !== "string" ||
        typeof organizationId !== "string" ||
        typeof userId !== "string"
      ) {
        logger.error("Recording done event missing required metadata", {
          component: "BotWebhookService.processRecordingDone",
          botId: bot.id,
          metadata,
        });
        return err(
          ActionErrors.internal(
            "Missing required metadata in webhook event",
            undefined,
            "BotWebhookService.processRecordingDone"
          )
        );
      }

      const session = await BotSessionsQueries.findByRecallBotId(
        bot.id,
        organizationId
      );

      if (!session) {
        logger.error("Bot session not found for recording", {
          component: "BotWebhookService.processRecordingDone",
          botId: bot.id,
          organizationId,
        });
        return err(
          ActionErrors.internal(
            "Bot session not found",
            undefined,
            "BotWebhookService.processRecordingDone"
          )
        );
      }

      const existingRecording = await RecordingsQueries.selectRecordingByExternalId(
        recording.id,
        organizationId
      );

      if (existingRecording) {
        logger.info("Recording already exists with external ID", {
          component: "BotWebhookService.processRecordingDone",
          recordingId: existingRecording.id,
          externalRecordingId: recording.id,
        });
        const updatedSession = await BotSessionsQueries.updateRecordingId(
          bot.id,
          organizationId,
          existingRecording.id,
          "done"
        );
        if (updatedSession) {
          await this.triggerAiWorkflow(
            existingRecording.id,
            "BotWebhookService.processRecordingDone"
          );
        }
        return ok(undefined);
      }

      const urlResult = await RecallApiService.getRecordingDownloadUrl(
        bot.id,
        recording.id
      );

      if (urlResult.isErr()) {
        return err(urlResult.error);
      }

      const { url, duration } = urlResult.value;
      const downloadResult = await this.downloadRecording(url);

      if (downloadResult.isErr()) {
        return err(downloadResult.error);
      }

      const { fileBuffer, mimeType } = downloadResult.value;
      const fileName = `recall-${recording.id}.${this.getFileExtension(mimeType)}`;
      const timestamp = Date.now();
      const blobPath = `recordings/${timestamp}-${fileName}`;

      const shouldEncrypt = process.env.DISABLE_ENCRYPTION_AT_REST !== "true";
      let fileToUpload: Buffer = fileBuffer;
      let encryptionMetadata: string | null = null;

      if (shouldEncrypt && !process.env.ENCRYPTION_MASTER_KEY) {
        logger.error("Encryption is required but master key not configured", {
          component: "BotWebhookService.processRecordingDone",
        });
        return err(
          ActionErrors.internal(
            "ENCRYPTION_MASTER_KEY is not configured. Encryption at rest is required by default.",
            undefined,
            "BotWebhookService.processRecordingDone"
          )
        );
      }

      if (shouldEncrypt) {
        try {
          const encryptedBase64 = encrypt(fileBuffer);
          const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
          fileToUpload = encryptedBuffer;
          encryptionMetadata = JSON.stringify(generateEncryptionMetadata());
        } catch (encryptError) {
          logger.error("Failed to encrypt recording", {
            component: "BotWebhookService.processRecordingDone",
            error: serializeError(encryptError),
          });
          return err(
            ActionErrors.internal(
              "Failed to encrypt recording",
              encryptError as Error,
              "BotWebhookService.processRecordingDone"
            )
          );
        }
      }

      const blob = await put(blobPath, fileToUpload, {
        access: shouldEncrypt ? "private" : "public",
        contentType: mimeType,
      } as Parameters<typeof put>[2]);

      const createResult = await RecordingService.createRecording(
        {
          projectId,
          title: session.meetingTitle ?? "Bot Recording",
          description: null,
          fileUrl: blob.url,
          fileName,
          fileSize: fileBuffer.length,
          fileMimeType: mimeType,
          duration: duration ?? null,
          recordingDate: new Date(),
          recordingMode: "bot",
          transcriptionStatus: "pending",
          transcriptionText: null,
          organizationId,
          createdById: userId,
          externalRecordingId: recording.id,
          isEncrypted: shouldEncrypt,
          encryptionMetadata,
        },
        true
      );

      if (createResult.isErr()) {
        return err(createResult.error);
      }

      const finalRecordingId = createResult.value.id;

      await BotSessionsQueries.updateRecordingId(
        bot.id,
        organizationId,
        finalRecordingId,
        "done"
      );

      await this.triggerAiWorkflow(
        finalRecordingId,
        "BotWebhookService.processRecordingDone"
      );

      logger.info("Recording processed and bot session updated", {
        component: "BotWebhookService.processRecordingDone",
        recordingId: finalRecordingId,
        sessionId: session.id,
        externalRecordingId: recording.id,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process recording done event", {
        component: "BotWebhookService.processRecordingDone",
        error: serializeError(error),
        botId: event.data?.bot?.id,
      });
      return err(
        ActionErrors.internal(
          "Failed to process recording",
          error as Error,
          "BotWebhookService.processRecordingDone"
        )
      );
    }
  }

  /**
   * Process legacy bot.recording_ready (has URL in payload)
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

      const existingRecording =
        await RecordingsQueries.selectRecordingByExternalId(
          recording.id,
          organizationId
        );

      let finalRecordingId: string;

      if (existingRecording) {
        finalRecordingId = existingRecording.id;
      } else {
        const downloadResult = await this.downloadRecording(recording.url);
        if (downloadResult.isErr()) return err(downloadResult.error);

        const { fileBuffer, mimeType } = downloadResult.value;
        const fileName = `recall-${recording.id}.${this.getFileExtension(mimeType)}`;
        const timestamp = Date.now();
        const blobPath = `recordings/${timestamp}-${fileName}`;

        const shouldEncrypt = process.env.DISABLE_ENCRYPTION_AT_REST !== "true";
        let fileToUpload: Buffer = fileBuffer;
        let encryptionMetadata: string | null = null;

        if (shouldEncrypt && !process.env.ENCRYPTION_MASTER_KEY) {
          logger.error("Encryption is required but master key not configured", {
            component: "BotWebhookService.processRecordingReady",
          });
          return err(
            ActionErrors.internal(
              "ENCRYPTION_MASTER_KEY is not configured. Encryption at rest is required by default.",
              undefined,
              "BotWebhookService.processRecordingReady"
            )
          );
        }

        if (shouldEncrypt) {
          try {
            const encryptedBase64 = encrypt(fileBuffer);
            const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
            fileToUpload = encryptedBuffer;
            encryptionMetadata = JSON.stringify(generateEncryptionMetadata());
          } catch (encryptError) {
            logger.error("Failed to encrypt recording", {
              component: "BotWebhookService.processRecordingReady",
              error: serializeError(encryptError),
            });
            return err(
              ActionErrors.internal(
                "Failed to encrypt recording",
                encryptError as Error,
                "BotWebhookService.processRecordingReady"
              )
            );
          }
        }

        const blob = await put(blobPath, fileToUpload, {
          access: shouldEncrypt ? "private" : "public",
          contentType: mimeType,
        } as Parameters<typeof put>[2]);

        const recordingDate = meeting?.start_time
          ? new Date(meeting.start_time)
          : new Date();

        const createResult = await RecordingService.createRecording(
          {
            projectId,
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
            organizationId,
            createdById: userId,
            externalRecordingId: recording.id,
            isEncrypted: shouldEncrypt,
            encryptionMetadata,
          },
          true
        );

        if (createResult.isErr()) return err(createResult.error);
        finalRecordingId = createResult.value.id;
      }

      await BotSessionsQueries.updateRecordingId(
        bot.id,
        organizationId,
        finalRecordingId,
        bot.status
      );

      await this.triggerAiWorkflow(
        finalRecordingId,
        "BotWebhookService.processRecordingReady"
      );

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
   * Process recording.failed - update bot session with failure
   */
  static async processRecordingFailed(
    event: SvixRecordingEvent
  ): Promise<ActionResult<void>> {
    try {
      const { bot, data } = event.data;
      const metadata = getMetadata(event);
      const organizationId = metadata?.organizationId;

      if (!organizationId || typeof organizationId !== "string") {
        logger.warn("Recording failed event missing organizationId", {
          component: "BotWebhookService.processRecordingFailed",
          botId: bot.id,
        });
        return ok(undefined);
      }

      const subCode = data?.sub_code ? String(data.sub_code) : "unknown";
      const errorMsg = `Recording failed (sub_code: ${subCode})`;

      await BotSessionsQueries.updateByRecallBotId(bot.id, organizationId, {
        botStatus: "failed",
        recallStatus: "recording_failed",
        error: errorMsg,
      });

      logger.info("Updated bot session for recording failure", {
        component: "BotWebhookService.processRecordingFailed",
        botId: bot.id,
        subCode,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process recording failed event", {
        component: "BotWebhookService.processRecordingFailed",
        error: serializeError(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to process recording failure",
          error as Error,
          "BotWebhookService.processRecordingFailed"
        )
      );
    }
  }

  /**
   * Process recording.deleted - soft-delete or cleanup
   */
  static async processRecordingDeleted(
    event: SvixRecordingEvent
  ): Promise<ActionResult<void>> {
    try {
      const { bot, recording } = event.data;
      const metadata = getMetadata(event);
      const organizationId = metadata?.organizationId;

      if (!organizationId) {
        logger.warn("Recording deleted event missing organizationId", {
          component: "BotWebhookService.processRecordingDeleted",
          botId: bot.id,
        });
        return ok(undefined);
      }

      const existingRecording = await RecordingsQueries.selectRecordingByExternalId(
        recording.id,
        organizationId
      );

      if (existingRecording) {
        logger.info("Recording deleted from Recall - marking for cleanup", {
          component: "BotWebhookService.processRecordingDeleted",
          recordingId: existingRecording.id,
          externalRecordingId: recording.id,
        });
        // Could add soft-delete or status field if needed; for now just log
      }

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process recording deleted event", {
        component: "BotWebhookService.processRecordingDeleted",
        error: serializeError(error),
      });
      return err(
        ActionErrors.internal(
          "Failed to process recording deleted",
          error as Error,
          "BotWebhookService.processRecordingDeleted"
        )
      );
    }
  }

  private static async triggerAiWorkflow(
    recordingId: string,
    component: string
  ): Promise<void> {
    try {
      const workflowRun = await start(convertRecordingIntoAiInsights, [
        recordingId,
      ]);
      logger.info("AI processing workflow triggered", {
        component,
        recordingId,
        run: {
          id: workflowRun.runId,
          name: workflowRun.workflowName,
          status: workflowRun.status,
        },
      });
    } catch (error) {
      logger.error("Failed to trigger AI processing workflow", {
        component,
        recordingId,
        error: serializeError(error),
      });
    }
  }

  private static async downloadRecording(
    url: string
  ): Promise<ActionResult<{ fileBuffer: Buffer; mimeType: string }>> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5 * 60 * 1000),
      });
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
