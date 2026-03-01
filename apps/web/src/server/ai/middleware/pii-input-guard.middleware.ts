import type { LanguageModelV3Middleware } from "@ai-sdk/provider";

import { logger } from "@/lib/logger";
import { PIIDetectionService } from "@/server/services/pii-detection.service";

import {
  extractLastUserMessage,
  GuardrailError,
  type GuardrailOptions,
} from "./types";

export function createPIIInputGuardMiddleware(
  options: GuardrailOptions = {}
): LanguageModelV3Middleware {
  const mode = options.pii?.mode ?? "redact";
  const minConfidence = options.pii?.minConfidence ?? 0.7;

  return {
    specificationVersion: "v3",

    async transformParams({ params }) {
      const userMessage = extractLastUserMessage(params);

      if (!userMessage || userMessage.length === 0) {
        return params;
      }

      const detections = PIIDetectionService.detectPII(
        userMessage,
        minConfidence
      );

      if (detections.length === 0) {
        return params;
      }

      const detectedTypes = [...new Set(detections.map((d) => d.type))];

      logger.warn("PII detected in user input", {
        component: "PIIInputGuardMiddleware",
        types: detectedTypes,
        count: detections.length,
        mode,
        organizationId: options.organizationId,
        userId: options.userId,
      });

      if (mode === "block") {
        throw new GuardrailError({
          type: "pii",
          severity: "block",
          message:
            "Your message contains personally identifiable information (PII) that cannot be sent to the AI. Please remove sensitive data and try again.",
          details: { types: detectedTypes, count: detections.length },
        });
      }

      const redactedMessage = PIIDetectionService.applyRedactions(
        userMessage,
        detections
      );

      const updatedPrompt = params.prompt.map((message, idx) => {
        if (idx !== params.prompt.length - 1 || message.role !== "user") {
          return message;
        }

        return {
          ...message,
          content: message.content.map((part) => {
            if (part.type === "text") {
              return { ...part, text: redactedMessage };
            }
            return part;
          }),
        };
      });

      return { ...params, prompt: updatedPrompt };
    },
  };
}

