import { logger, serializeError } from "@/lib/logger";
import { BotWebhookService } from "@/server/services/bot-webhook.service";
import {
  recallWebhookEventSchema,
  type RecallWebhookEvent,
} from "@/server/validation/bot/recall-webhook.schema";
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/webhooks/recall
 * Receives Recall.ai webhook events for bot status changes and recording completion
 * This endpoint is public (no auth required) as Recall.ai calls it directly
 * Signature verification ensures authenticity
 */
export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.RECALL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error("RECALL_WEBHOOK_SECRET not configured", {
        component: "POST /api/webhooks/recall",
      });
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("x-recall-signature");

    // Verify signature
    if (signature) {
      // Generate expected signature as Buffer (without hex encoding)
      const expectedSignatureBuffer = createHmac("sha256", webhookSecret)
        .update(body)
        .digest();

      // Convert incoming signature header to Buffer (parse as hex)
      let receivedSignatureBuffer: Buffer;
      try {
        receivedSignatureBuffer = Buffer.from(signature, "hex");
      } catch (error) {
        logger.warn("Invalid webhook signature format", {
          component: "POST /api/webhooks/recall",
        });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      // Check buffer lengths match before comparison
      if (expectedSignatureBuffer.length !== receivedSignatureBuffer.length) {
        logger.warn("Invalid webhook signature", {
          component: "POST /api/webhooks/recall",
        });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      // Use timing-safe comparison
      if (!timingSafeEqual(expectedSignatureBuffer, receivedSignatureBuffer)) {
        logger.warn("Invalid webhook signature", {
          component: "POST /api/webhooks/recall",
        });
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      logger.warn("Missing webhook signature", {
        component: "POST /api/webhooks/recall",
      });
      // In development, allow requests without signature
      // In production, this should be enforced
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }
    }

    // Parse and validate payload
    let payload: RecallWebhookEvent;
    try {
      const parsed = JSON.parse(body);
      payload = recallWebhookEventSchema.parse(parsed);
    } catch (error) {
      logger.error("Invalid webhook payload", {
        component: "POST /api/webhooks/recall",
        error: serializeError(error),
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    logger.info("Received Recall.ai webhook event", {
      component: "POST /api/webhooks/recall",
      event: payload.event,
      botId: payload.bot.id,
    });

    // Process event based on type
    let result;
    if (payload.event === "bot.status_change") {
      result = await BotWebhookService.processStatusChange(payload);
    } else if (payload.event === "bot.recording_ready") {
      result = await BotWebhookService.processRecordingReady(payload);
    } else {
      logger.warn("Unknown webhook event type", {
        component: "POST /api/webhooks/recall",
        event: (payload as RecallWebhookEvent).event,
      });
      return NextResponse.json({ success: true }); // Acknowledge unknown events
    }

    if (result.isErr()) {
      logger.error("Failed to process webhook event", {
        component: "POST /api/webhooks/recall",
        error: result.error,
        event: payload.event,
      });
      // Return 200 to prevent Recall.ai from retrying
      // Errors are logged for manual investigation
      return NextResponse.json({ success: false, error: "Processing failed" });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error in Recall.ai webhook handler", {
      component: "POST /api/webhooks/recall",
      error: serializeError(error),
    });
    // Return 200 to prevent Recall.ai from retrying
    return NextResponse.json({ success: false, error: "Internal error" });
  }
}

