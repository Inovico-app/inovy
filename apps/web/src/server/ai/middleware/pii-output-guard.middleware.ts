import type {
  LanguageModelV3Middleware,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";

import { logger } from "@/lib/logger";
import { PIIDetectionService } from "@/server/services/pii-detection.service";

import { extractTextFromContent, type GuardrailOptions } from "./types";

export function createPIIOutputGuardMiddleware(
  options: GuardrailOptions = {}
): LanguageModelV3Middleware {
  const minConfidence = options.pii?.minConfidence ?? 0.7;

  return {
    specificationVersion: "v3",

    async wrapGenerate({ doGenerate }) {
      const result = await doGenerate();

      const fullText = extractTextFromContent(result.content);

      if (!fullText) {
        return result;
      }

      const detections = PIIDetectionService.detectPII(fullText, minConfidence);

      if (detections.length === 0) {
        return result;
      }

      const detectedTypes = [...new Set(detections.map((d) => d.type))];

      logger.warn("PII detected in AI output, redacting", {
        component: "PIIOutputGuardMiddleware",
        types: detectedTypes,
        count: detections.length,
        organizationId: options.organizationId,
      });

      const redactedText = PIIDetectionService.applyRedactions(
        fullText,
        detections
      );

      const updatedContent = result.content.map((block) => {
        if (block.type === "text") {
          return { ...block, text: redactedText };
        }
        return block;
      });

      return { ...result, content: updatedContent };
    },

    async wrapStream({ doStream }) {
      const { stream, ...rest } = await doStream();

      const textBlocks = new Map<string, string>();

      const transformStream = new TransformStream<
        LanguageModelV3StreamPart,
        LanguageModelV3StreamPart
      >({
        transform(chunk, controller) {
          switch (chunk.type) {
            case "text-start": {
              textBlocks.set(chunk.id, "");
              controller.enqueue(chunk);
              break;
            }
            case "text-delta": {
              const existing = textBlocks.get(chunk.id) ?? "";
              textBlocks.set(chunk.id, existing + chunk.delta);
              controller.enqueue(chunk);
              break;
            }
            case "text-end": {
              const blockText = textBlocks.get(chunk.id) ?? "";
              const detections = PIIDetectionService.detectPII(
                blockText,
                minConfidence
              );

              if (detections.length > 0) {
                const detectedTypes = [
                  ...new Set(detections.map((d) => d.type)),
                ];

                logger.warn("PII detected in streamed AI output", {
                  component: "PIIOutputGuardMiddleware",
                  types: detectedTypes,
                  count: detections.length,
                  blockId: chunk.id,
                  organizationId: options.organizationId,
                });
              }

              textBlocks.delete(chunk.id);
              controller.enqueue(chunk);
              break;
            }
            default: {
              controller.enqueue(chunk);
              break;
            }
          }
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}

