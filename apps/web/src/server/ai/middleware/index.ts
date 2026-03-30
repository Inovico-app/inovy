import type {
  LanguageModelV3,
  LanguageModelV3Middleware,
} from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

import { logger } from "@/lib/logger";

import { ClassifierRegistry } from "../classifiers/classifier-registry";
import { InjectionClassifier } from "../classifiers/injection.classifier";
import { RiskClassifier } from "../classifiers/risk.classifier";
import { TopicClassifier } from "../classifiers/topic.classifier";
import { extractLastUserMessage, GuardrailError } from "./types";
import type { GuardrailOptions } from "./types";

import { createAuditMiddleware } from "./audit.middleware";
import { createInputModerationMiddleware } from "./input-moderation.middleware";
import { createOutputValidationMiddleware } from "./output-validation.middleware";
import { createPIIInputGuardMiddleware } from "./pii-input-guard.middleware";
import { createPIIOutputGuardMiddleware } from "./pii-output-guard.middleware";

export { GuardrailError } from "./types";
export type { GuardrailOptions, GuardrailViolation } from "./types";

/**
 * Create middleware that runs the classifier registry for input classification.
 */
function createClassifierMiddleware(
  options: GuardrailOptions = {},
): LanguageModelV3Middleware {
  const classifierConfig = options.classifier?.config;
  const orgPolicy = options.classifier?.orgPolicy;

  const registry = new ClassifierRegistry({
    classifiers: [
      new InjectionClassifier(),
      new TopicClassifier(),
      new RiskClassifier(),
    ],
    config: classifierConfig,
    orgPolicy,
  });

  return {
    specificationVersion: "v3",

    async transformParams({ params }) {
      const userMessage = extractLastUserMessage(params);

      if (!userMessage || userMessage.length === 0) {
        return params;
      }

      const result = await registry.evaluate({
        text: userMessage,
        context: {
          scope: options.chatContext ?? "project",
        },
        metadata: {
          organizationId: options.organizationId ?? "",
          userId: options.userId ?? "",
          conversationId: options.conversationId ?? "",
        },
      });

      // Store verdicts in params for audit middleware to pick up
      (params as Record<string, unknown>).__classifierVerdicts =
        result.verdicts;
      (params as Record<string, unknown>).__classifierResult = result;

      if (result.finalAction === "block") {
        logger.security.suspiciousActivity(
          "Classifier registry blocked request",
          {
            component: "ClassifierMiddleware",
            blockedBy: result.blockedBy,
            totalLatencyMs: result.totalLatencyMs,
            verdictCount: result.verdicts.length,
          },
        );

        throw new GuardrailError({
          type: "classifier",
          severity: "block",
          message:
            result.blockMessage ??
            "Your message was blocked by our content safety system. Please rephrase your request.",
          details: {
            blockedBy: result.blockedBy,
            verdicts: result.verdicts.map((v) => ({
              dimension: v.dimension,
              action: v.action,
              confidence: v.confidence,
            })),
          },
        });
      }

      if (result.finalAction === "warn") {
        logger.info("Classifier registry issued warning", {
          component: "ClassifierMiddleware",
          totalLatencyMs: result.totalLatencyMs,
          verdicts: result.verdicts.map((v) => ({
            dimension: v.dimension,
            action: v.action,
            confidence: v.confidence,
          })),
        });
      }

      return params;
    },
  };
}

/**
 * Wrap a language model with the full guardrails middleware stack.
 *
 * Middleware execution order (first to last):
 *   1. Input moderation  (OpenAI Moderation API)
 *   2. PII input guard   (redact / block PII in user message)
 *   3. Classifier guard   (LLM-based injection, topic, risk classification)
 *   4. PII output guard   (redact PII in model response)
 *   5. Output validation  (moderate model response)
 *   6. Audit              (log input + output + classifier verdicts)
 */
export function createGuardedModel(
  model: LanguageModelV3,
  options: GuardrailOptions = {},
): LanguageModelV3 {
  const useClassifiers = options.classifier?.enabled !== false;

  return wrapLanguageModel({
    model,
    middleware: [
      createInputModerationMiddleware(),
      createPIIInputGuardMiddleware(options),
      ...(useClassifiers ? [createClassifierMiddleware(options)] : []),
      createPIIOutputGuardMiddleware(options),
      createOutputValidationMiddleware(),
      ...(options.audit?.enabled !== false
        ? [createAuditMiddleware(options)]
        : []),
    ],
  });
}
