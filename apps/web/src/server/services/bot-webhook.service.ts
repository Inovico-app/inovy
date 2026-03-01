import { CacheInvalidation } from "@/lib/cache-utils";
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
import type {
  BotRecordingReadyEvent,
  BotStatusChangeEvent,
  ParticipantEventChatMessage,
  RecallWebhookEvent,
  SvixBotStatusEvent,
  SvixRecordingEvent,
} from "../validation/bot/recall-webhook.schema";
import {
  mapRecallEventToBotStatus,
  mapRecallStatusToBotStatus,
} from "./bot-providers/recall/status-mapper";
import { NotificationService } from "./notification.service";
import { RecallApiService } from "./recall-api.service";
import { RecordingService } from "./recording.service";

const KICK_COMMANDS = new Set([
  "/stop",
  "/kick",
  "/leave",
  "!stop",
  "!kick",
  "!leave",
]);

const TERMINAL_BOT_STATUSES = new Set<BotStatus>([
  "leaving",
  "completed",
  "failed",
]);

function toStringRecord(meta: unknown): Record<string, string> | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const entries = Object.entries(meta as Record<string, unknown>).filter(
    (v): v is [string, string] => typeof v[1] === "string"
  );
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as Record<string, string>;
}

function getMetadata(
  payload: RecallWebhookEvent
): Record<string, string> | undefined {
  if ("data" in payload) {
    const botMeta = toStringRecord(payload.data?.bot?.metadata);
    if (botMeta) return botMeta;

    const data = payload.data as Record<string, unknown>;
    if (data.recording && typeof data.recording === "object") {
      const recMeta = toStringRecord(
        (data.recording as { metadata?: unknown }).metadata
      );
      if (recMeta) return recMeta;
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
  if (
    "data" in payload &&
    payload.data &&
    "data" in payload.data &&
    payload.data.data &&
    typeof payload.data.data === "object" &&
    "code" in payload.data.data &&
    typeof payload.data.data.code === "string"
  ) {
    return payload.data.data.code;
  }
  return "";
}

interface ResolvedMetadata {
  projectId: string;
  organizationId: string;
  userId: string;
}

async function resolveWebhookMetadata(
  event: RecallWebhookEvent,
  botId: string,
  component: string
): Promise<ResolvedMetadata | null> {
  const metadata = getMetadata(event);
  let projectId = metadata?.projectId;
  let organizationId = metadata?.organizationId;
  let userId = metadata?.userId;

  if (!projectId || !organizationId || !userId) {
    logger.warn(
      "Webhook event metadata incomplete, falling back to session lookup",
      {
        component,
        botId,
        metadata,
      }
    );
    const fallbackSession =
      await BotSessionsQueries.findByRecallBotIdOnly(botId);
    if (fallbackSession) {
      projectId ??= fallbackSession.projectId;
      organizationId ??= fallbackSession.organizationId;
      userId ??= fallbackSession.userId;
    }
  }

  if (!projectId || !organizationId || !userId) {
    logger.error("Webhook event missing required metadata after fallback", {
      component,
      botId,
      metadata,
    });
    return null;
  }

  return { projectId, organizationId, userId };
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
      const resolved = await resolveWebhookMetadata(
        event,
        botId,
        "BotWebhookService.processStatusChange"
      );

      if (!resolved) {
        return ok(undefined);
      }

      const { organizationId } = resolved;

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
   * Process participant_events.chat_message from real-time webhook.
   * Checks if the message matches a kick command and removes the bot from the call.
   */
  static async processChatMessage(
    event: ParticipantEventChatMessage
  ): Promise<ActionResult<void>> {
    try {
      const chatData = event.data.data;
      const text = chatData.data?.text?.trim().toLowerCase() ?? "";
      const senderName = chatData.participant.name ?? "Unknown participant";
      const botId = event.data.bot?.id;
      const metadata = event.data.bot?.metadata;
      const organizationId = metadata?.organizationId;

      if (!KICK_COMMANDS.has(text)) {
        return ok(undefined);
      }

      logger.info("Kick command detected in meeting chat", {
        component: "BotWebhookService.processChatMessage",
        command: text,
        senderName,
        botId,
      });

      if (!botId) {
        logger.warn("Chat message event missing bot ID", {
          component: "BotWebhookService.processChatMessage",
        });
        return ok(undefined);
      }

      if (!organizationId || typeof organizationId !== "string") {
        logger.warn(
          "Chat message event missing organizationId in bot metadata",
          {
            component: "BotWebhookService.processChatMessage",
            botId,
          }
        );
        return ok(undefined);
      }

      const session = await BotSessionsQueries.findByRecallBotId(
        botId,
        organizationId
      );

      if (!session) {
        logger.warn("Bot session not found for chat kick command", {
          component: "BotWebhookService.processChatMessage",
          botId,
          organizationId,
        });
        return ok(undefined);
      }

      if (TERMINAL_BOT_STATUSES.has(session.botStatus as BotStatus)) {
        logger.info("Bot already in terminal state, ignoring kick command", {
          component: "BotWebhookService.processChatMessage",
          botId,
          sessionId: session.id,
          currentStatus: session.botStatus,
        });
        return ok(undefined);
      }

      const leaveResult = await RecallApiService.leaveCall(botId);

      if (leaveResult.isErr()) {
        logger.warn(
          "Failed to remove bot via leave_call API, continuing with status update",
          {
            component: "BotWebhookService.processChatMessage",
            botId,
            sessionId: session.id,
            error: leaveResult.error,
          }
        );
      }

      await BotSessionsQueries.updateByRecallBotId(botId, organizationId, {
        botStatus: "leaving",
        recallStatus: "kicked_by_participant",
        error: `Bot removed via chat command by ${senderName}`,
        leftAt: new Date(),
      });

      try {
        const notificationResult = await NotificationService.createNotification(
          {
            recordingId: session.recordingId ?? null,
            projectId: session.projectId,
            userId: session.userId,
            organizationId,
            type: "bot_session_update",
            title: "Bot removed from meeting",
            message: `Bot was removed from "${session.meetingTitle || "meeting"}" by ${senderName} via chat command.`,
            metadata: {
              sessionId: session.id,
              action: "kicked",
              kickedBy: senderName,
              command: text,
            },
          }
        );

        if (notificationResult.isErr()) {
          logger.warn("Failed to create kick notification", {
            component: "BotWebhookService.processChatMessage",
            sessionId: session.id,
            error: notificationResult.error.message,
          });
        }
      } catch (notifyError) {
        logger.error("Unexpected error creating kick notification", {
          component: "BotWebhookService.processChatMessage",
          sessionId: session.id,
          error: serializeError(notifyError),
        });
      }

      CacheInvalidation.invalidateBotSessions(organizationId);
      CacheInvalidation.invalidateBotSession(session.id, organizationId);
      CacheInvalidation.invalidateNotifications(session.userId, organizationId);

      logger.info("Bot successfully kicked via chat command", {
        component: "BotWebhookService.processChatMessage",
        botId,
        sessionId: session.id,
        kickedBy: senderName,
        command: text,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process chat message event", {
        component: "BotWebhookService.processChatMessage",
        error: serializeError(error),
        botId: event.data.bot?.id,
      });
      return err(
        ActionErrors.internal(
          "Failed to process chat message",
          error as Error,
          "BotWebhookService.processChatMessage"
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
      const resolved = await resolveWebhookMetadata(
        event,
        bot.id,
        "BotWebhookService.processRecordingDone"
      );

      if (!resolved) return ok(undefined);

      const { projectId, organizationId, userId } = resolved;

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
        return ok(undefined);
      }

      const existingRecording =
        await RecordingsQueries.selectRecordingByExternalId(
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

      const shouldEncrypt = process.env.ENABLE_ENCRYPTION_AT_REST === "true";
      let fileToUpload: Buffer = fileBuffer;
      let encryptionMetadata: string | null = null;

      if (shouldEncrypt && !process.env.ENCRYPTION_MASTER_KEY) {
        logger.error("Encryption enabled but master key not configured", {
          component: "BotWebhookService.processRecordingDone",
        });
        return err(
          ActionErrors.internal(
            "Encryption configuration error",
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
      const { bot, recording, meeting } = event;
      const resolved = await resolveWebhookMetadata(
        event,
        bot.id,
        "BotWebhookService.processRecordingReady"
      );

      if (!resolved) return ok(undefined);

      const { projectId, organizationId, userId } = resolved;

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
        return ok(undefined);
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

        const shouldEncrypt = process.env.ENABLE_ENCRYPTION_AT_REST === "true";
        let fileToUpload: Buffer = fileBuffer;
        let encryptionMetadata: string | null = null;

        if (shouldEncrypt && !process.env.ENCRYPTION_MASTER_KEY) {
          logger.error("Encryption enabled but master key not configured", {
            component: "BotWebhookService.processRecordingReady",
          });
          return err(
            ActionErrors.internal(
              "Encryption configuration error",
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

      const existingRecording =
        await RecordingsQueries.selectRecordingByExternalId(
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

