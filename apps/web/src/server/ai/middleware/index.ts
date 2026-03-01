import type { LanguageModelV3 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

import { createAuditMiddleware } from "./audit.middleware";
import { createInjectionGuardMiddleware } from "./injection-guard.middleware";
import { createInputModerationMiddleware } from "./input-moderation.middleware";
import { createOutputValidationMiddleware } from "./output-validation.middleware";
import { createPIIInputGuardMiddleware } from "./pii-input-guard.middleware";
import { createPIIOutputGuardMiddleware } from "./pii-output-guard.middleware";
import { createTopicGuardMiddleware } from "./topic-guard.middleware";
import type { GuardrailOptions } from "./types";

export { GuardrailError } from "./types";
export type { GuardrailOptions, GuardrailViolation } from "./types";

/**
 * Wrap a language model with the full guardrails middleware stack.
 *
 * Middleware execution order (first to last):
 *   1. Input moderation  (OpenAI Moderation API)
 *   2. PII input guard   (redact / block PII in user message)
 *   3. Injection guard    (block prompt injection attempts)
 *   4. Topic guard        (block off-topic / dangerous requests)
 *   5. PII output guard   (redact PII in model response)
 *   6. Output validation  (moderate model response)
 *   7. Audit              (log input + output)
 */
export function createGuardedModel(
  model: LanguageModelV3,
  options: GuardrailOptions = {}
): LanguageModelV3 {
  return wrapLanguageModel({
    model,
    middleware: [
      createInputModerationMiddleware(),
      createPIIInputGuardMiddleware(options),
      createInjectionGuardMiddleware(),
      createTopicGuardMiddleware(),
      createPIIOutputGuardMiddleware(options),
      createOutputValidationMiddleware(),
      ...(options.audit?.enabled !== false
        ? [createAuditMiddleware(options)]
        : []),
    ],
  });
}

