import { logger } from "@/lib/logger";

import type { GroundingEnforcerConfig, GroundingEvaluation } from "./types";
import { DEFAULT_GROUNDING_CONFIG } from "./types";
import type { GroundingClassifier } from "./grounding.classifier";

export interface GroundingEnforcerInput {
  responseText: string;
  context: unknown[];
  retryFn?: (groundingInstruction: string) => Promise<string>;
}

export interface GroundingEnforcerResult {
  action: "pass" | "annotate";
  finalText: string;
  retried: boolean;
  evaluation: GroundingEvaluation;
  ungroundedClaims?: { claim: string; reason: string }[];
}

const GROUNDING_RETRY_INSTRUCTION =
  "IMPORTANT: Your previous response contained claims not grounded in the provided sources. " +
  "Rewrite your response following these rules strictly:\n" +
  "1. Every factual claim MUST have a citation [n] referencing the source\n" +
  "2. If a fact cannot be traced to provided sources, explicitly state that\n" +
  "3. Do NOT make general claims like 'experts say' or 'it is well-known'\n" +
  "4. If you are unsure, say so clearly";

export class GroundingEnforcer {
  private readonly classifier: GroundingClassifier;
  private readonly config: GroundingEnforcerConfig;

  constructor(
    classifier: GroundingClassifier,
    config?: Partial<GroundingEnforcerConfig>,
  ) {
    this.classifier = classifier;
    this.config = { ...DEFAULT_GROUNDING_CONFIG, ...config };
  }

  async enforce(
    input: GroundingEnforcerInput,
  ): Promise<GroundingEnforcerResult> {
    const firstEval = await this.classifier.evaluate(
      input.responseText,
      input.context,
    );

    if (firstEval.groundedRatio >= this.config.groundedThreshold) {
      return {
        action: "pass",
        finalText: input.responseText,
        retried: false,
        evaluation: firstEval,
      };
    }

    logger.info("Response below grounding threshold, attempting retry", {
      component: "GroundingEnforcer",
      groundedRatio: firstEval.groundedRatio,
      threshold: this.config.groundedThreshold,
      ungroundedClaimCount: firstEval.ungroundedClaims.length,
    });

    if (!input.retryFn) {
      return {
        action: "annotate",
        finalText: input.responseText,
        retried: false,
        evaluation: firstEval,
        ungroundedClaims: firstEval.ungroundedClaims,
      };
    }

    const retriedText = await input.retryFn(GROUNDING_RETRY_INSTRUCTION);

    const secondEval = await this.classifier.evaluate(
      retriedText,
      input.context,
    );

    if (secondEval.groundedRatio >= this.config.groundedThreshold) {
      return {
        action: "pass",
        finalText: retriedText,
        retried: true,
        evaluation: secondEval,
      };
    }

    logger.warn("Response still ungrounded after retry, annotating", {
      component: "GroundingEnforcer",
      groundedRatio: secondEval.groundedRatio,
      ungroundedClaimCount: secondEval.ungroundedClaims.length,
    });

    return {
      action: "annotate",
      finalText: retriedText,
      retried: true,
      evaluation: secondEval,
      ungroundedClaims: secondEval.ungroundedClaims,
    };
  }
}
