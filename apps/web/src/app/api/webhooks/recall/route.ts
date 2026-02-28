import { logger, serializeError } from "@/lib/logger";
import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { verifyRequestFromRecall } from "@/server/lib/verify-recall-webhook";
import { BotWebhookService, getBotId } from "@/server/services/bot-webhook.service";
import {
  recallWebhookEventSchema,
  type BotRecordingReadyEvent,
  type BotStatusChangeEvent,
  type ParticipantEventChatMessage,
  type RecallWebhookEvent,
  type SvixBotStatusEvent,
  type SvixRecordingEvent,
} from "@/server/validation/bot/recall-webhook.schema";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Recall requires 200 for all responses to avoid retries.
 * Log errors but never return 4xx/5xx.
 */
function okResponse(body?: object) {
  return NextResponse.json(body ?? { success: true });
}

/**
 * POST /api/webhooks/recall
 * Receives Recall.ai webhook events for bot status changes and recording lifecycle
 * This endpoint is public (no auth required) as Recall.ai calls it directly
 * Signature verification ensures authenticity. Always returns 200 per Recall requirements.
 */
export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("RECALL_WEBHOOK_SECRET not configured", {
        component: "POST /api/webhooks/recall",
      });
      return okResponse({ success: false, error: "Unable to process request" });
    }

    const body = await request.text();

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    try {
      verifyRequestFromRecall({
        secret: webhookSecret,
        headers,
        payload: body,
      });
    } catch (verifyError) {
      logger.warn("Recall webhook verification failed", {
        component: "POST /api/webhooks/recall",
        error: serializeError(verifyError),
      });
      return okResponse({ success: false, error: "Verification failed" });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch (error) {
      logger.error("Failed to parse webhook body", {
        component: "POST /api/webhooks/recall",
        error: serializeError(error),
      });
      return okResponse({ success: false, error: "Invalid payload" });
    }

    let payload: RecallWebhookEvent;
    try {
      payload = recallWebhookEventSchema.parse(parsedBody);
    } catch (error) {
      logger.error("Invalid webhook payload", {
        component: "POST /api/webhooks/recall",
        error: serializeError(error),
      });
      return okResponse({ success: false, error: "Invalid payload" });
    }

    const eventType = payload.event;
    const botId = getBotId(payload);

    logger.info("Received Recall.ai webhook event", {
      component: "POST /api/webhooks/recall",
      event: eventType,
      botId,
    });

    const eventHandlers: Record<
      string,
      (p: RecallWebhookEvent) => Promise<ActionResult<void>>
    > = {
      "participant_events.chat_message": (p) =>
        BotWebhookService.processChatMessage(p as ParticipantEventChatMessage),
      "bot.recording_ready": (p) =>
        BotWebhookService.processRecordingReady(p as BotRecordingReadyEvent),
      "recording.done": (p) =>
        BotWebhookService.processRecordingDone(p as SvixRecordingEvent),
      "recording.failed": (p) =>
        BotWebhookService.processRecordingFailed(p as SvixRecordingEvent),
      "recording.deleted": (p) =>
        BotWebhookService.processRecordingDeleted(p as SvixRecordingEvent),
    };

    let result;

    if (eventType === "recording.processing") {
      logger.info("Recording processing", {
        component: "POST /api/webhooks/recall",
        botId,
      });
      return okResponse();
    }

    const handler = eventHandlers[eventType];
    if (handler) {
      result = await handler(payload);
    } else if (eventType.startsWith("bot.")) {
      result = await BotWebhookService.processStatusChange(
        payload as SvixBotStatusEvent | BotStatusChangeEvent
      );
    } else {
      logger.warn("Unknown webhook event type", {
        component: "POST /api/webhooks/recall",
        event: eventType,
      });
      return okResponse();
    }

    if (result.isErr()) {
      logger.error("Failed to process webhook event", {
        component: "POST /api/webhooks/recall",
        error: result.error,
        event: eventType,
      });
      return okResponse({ success: false, error: "Processing failed" });
    }

    return okResponse();
  } catch (error) {
    logger.error("Error in Recall.ai webhook handler", {
      component: "POST /api/webhooks/recall",
      error: serializeError(error),
    });
    return okResponse({ success: false, error: "Internal error" });
  }
}
