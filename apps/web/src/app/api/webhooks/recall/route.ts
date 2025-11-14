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
    const signatureHeader = request.headers.get("Webhook-Signature");

    // Parse payload once (needed for both signature verification and validation)
    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(body);
    } catch (error) {
      logger.error("Failed to parse webhook body", {
        component: "POST /api/webhooks/recall",
        error: serializeError(error),
      });
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Verify signature
    if (signatureHeader) {
      // Parse comma/space-separated signature entries
      const signatureEntries = signatureHeader
        .split(/[,\s]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

      // Find entries with "v1," prefix
      const v1Signatures = signatureEntries
        .filter((entry) => entry.startsWith("v1,"))
        .map((entry) => entry.substring(3)); // Remove "v1," prefix

      if (v1Signatures.length === 0) {
        logger.warn("No v1 signature found in Webhook-Signature header", {
          component: "POST /api/webhooks/recall",
          signatureHeader,
        });
        if (process.env.NODE_ENV === "production") {
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      } else {
        // Extract webhook_id and webhook_timestamp from body or headers
        const bodyWebhookId = parsedBody.webhook_id as string | undefined;
        const headerWebhookId = request.headers.get("webhook-id");
        const webhookId =
          (bodyWebhookId && bodyWebhookId.trim() !== ""
            ? bodyWebhookId
            : headerWebhookId) ?? "";

        const bodyWebhookTimestamp = parsedBody.webhook_timestamp as
          | string
          | undefined;
        const headerWebhookTimestamp = request.headers.get("webhook-timestamp");
        const webhookTimestamp =
          (bodyWebhookTimestamp && bodyWebhookTimestamp.trim() !== ""
            ? bodyWebhookTimestamp
            : headerWebhookTimestamp) ?? "";

        if (!webhookId || !webhookTimestamp) {
          logger.warn(
            "Missing webhook_id or webhook_timestamp for signature verification",
            {
              component: "POST /api/webhooks/recall",
              webhookId: webhookId || "missing",
              webhookTimestamp: webhookTimestamp || "missing",
              hasWebhookIdInBody: "webhook_id" in parsedBody,
              hasWebhookTimestampInBody: "webhook_timestamp" in parsedBody,
            }
          );
          if (process.env.NODE_ENV === "production") {
            return NextResponse.json(
              { error: "Invalid signature" },
              { status: 401 }
            );
          }
        } else {
          // Build signed string: "{webhook_id}.{webhook_timestamp}."
          const signedString = `${webhookId}.${webhookTimestamp}.`;

          // Strip "whsec_" prefix from secret and base64-decode it
          let secretKey: Buffer;
          try {
            const secretWithoutPrefix = webhookSecret.startsWith("whsec_")
              ? webhookSecret.substring(6)
              : webhookSecret;
            secretKey = Buffer.from(secretWithoutPrefix, "base64");
          } catch (error) {
            logger.error("Failed to decode webhook secret", {
              component: "POST /api/webhooks/recall",
              error: serializeError(error),
            });
            return NextResponse.json(
              { error: "Invalid webhook secret configuration" },
              { status: 500 }
            );
          }

          // Compute HMAC-SHA256 and base64-encode it
          const computedSignature = createHmac("sha256", secretKey)
            .update(signedString)
            .digest("base64");

          // Verify against all v1 signatures using timing-safe comparison
          let isValid = false;
          for (const v1Signature of v1Signatures) {
            try {
              // Base64-decode the received signature
              const receivedSignatureBuffer = Buffer.from(
                v1Signature,
                "base64"
              );
              const computedSignatureBuffer = Buffer.from(
                computedSignature,
                "base64"
              );

              // Check buffer lengths match before comparison
              if (
                receivedSignatureBuffer.length ===
                computedSignatureBuffer.length
              ) {
                if (
                  timingSafeEqual(
                    receivedSignatureBuffer,
                    computedSignatureBuffer
                  )
                ) {
                  isValid = true;
                  break;
                }
              }
            } catch (error) {
              logger.warn("Failed to decode or compare signature", {
                component: "POST /api/webhooks/recall",
                signature: v1Signature,
                error: serializeError(error),
              });
            }
          }

          if (!isValid) {
            logger.warn("Invalid webhook signature", {
              component: "POST /api/webhooks/recall",
              webhookId,
              webhookTimestamp,
              computedSignature,
              receivedSignatures: v1Signatures,
            });
            if (process.env.NODE_ENV === "production") {
              return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
              );
            }
          }
        }
      }
    } else {
      logger.warn("Missing Webhook-Signature header", {
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

    // Validate payload schema
    let payload: RecallWebhookEvent;
    try {
      payload = recallWebhookEventSchema.parse(parsedBody);
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

