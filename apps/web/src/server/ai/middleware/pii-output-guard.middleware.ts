import type {
  LanguageModelV3Middleware,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";

import { logger } from "@/lib/logger";
import { PIIDetectionService } from "@/server/services/pii-detection.service";

import type { GuardrailOptions } from "./types";

export function createPIIOutputGuardMiddleware(
  options: GuardrailOptions = {}
): LanguageModelV3Middleware {
  const minConfidence = options.pii?.minConfidence ?? 0.7;

  return {
    specificationVersion: "v3",

    async wrapGenerate({ doGenerate }) {
      const result = await doGenerate();

      let totalDetections = 0;
      const allDetectedTypes = new Set<string>();

      // Redact per content block so multi-block outputs stay correct
      const updatedContent = result.content.map((block) => {
        if (block.type !== "text") {
          return block;
        }

        const detections = PIIDetectionService.detectPII(block.text, minConfidence);
        if (detections.length === 0) {
          return block;
        }

        totalDetections += detections.length;
        for (const d of detections) {
          allDetectedTypes.add(d.type);
        }

        return {
          ...block,
          text: PIIDetectionService.applyRedactions(block.text, detections),
        };
      });

      if (totalDetections > 0) {
        logger.warn("PII detected in AI output, redacting", {
          component: "PIIOutputGuardMiddleware",
          types: [...allDetectedTypes],
          count: totalDetections,
          organizationId: options.organizationId,
        });
      }

      return totalDetections > 0
        ? { ...result, content: updatedContent }
        : result;
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

                logger.warn("PII detected in streamed AI output, redacting", {
                  component: "PIIOutputGuardMiddleware",
                  types: detectedTypes,
                  count: detections.length,
                  blockId: chunk.id,
                  organizationId: options.organizationId,
                });

                // Emit a corrective delta that replaces the original text
                const redacted = PIIDetectionService.applyRedactions(
                  blockText,
                  detections
                );
                controller.enqueue({
                  type: "text-delta",
                  id: chunk.id,
                  delta: redacted.slice(blockText.length),
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
