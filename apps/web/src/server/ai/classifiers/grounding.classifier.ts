import { logger } from "@/lib/logger";
import { generateObject } from "ai";
import { z } from "zod";

import { connectionPool } from "@/server/services/connection-pool.service";

import type {
  Classifier,
  ClassifierInput,
  ClassifierVerdict,
  GroundingEvaluation,
} from "./types";

const GROUNDING_SCHEMA = z.object({
  overallGrounded: z.boolean(),
  groundedRatio: z.number().min(0).max(1),
  ungroundedClaims: z.array(
    z.object({
      claim: z.string(),
      reason: z.string(),
    }),
  ),
  reasoning: z.string(),
});

const SYSTEM_PROMPT = `You are a grounding evaluator for a meeting intelligence platform called Inovy. The AI assistant answers questions based on meeting recordings, transcriptions, and summaries. Every factual claim MUST be traceable to provided context.

You receive:
- The AI's response
- The context/sources that were available to it

Evaluate each factual claim in the response:
- grounded: Claim is supported by the provided context
- ungrounded: Claim has no basis in the provided context
- uncertain: Claim is partially supported or ambiguous

Ignore these (they are NOT claims):
- Greetings, formatting, meta-statements ("I found 3 results")
- Questions back to the user
- Statements acknowledging lack of information ("I don't have data on that")
- References to the user's own message

Only evaluate substantive factual claims about meeting content, decisions, action items, or participants.

Set groundedRatio to the fraction of claims that are grounded (1.0 = all grounded, 0.0 = none grounded). If there are no factual claims, set to 1.0.

Respond with JSON only.`;

export class GroundingClassifier implements Classifier {
  readonly name = "grounding-classifier";
  readonly version = "1.0.0";
  readonly dimension = "grounding" as const;

  async classify(input: ClassifierInput): Promise<ClassifierVerdict> {
    const evaluation = await this.evaluate(
      input.text,
      input.context.conversationHistory,
    );

    return {
      dimension: this.dimension,
      action: evaluation.overallGrounded ? "allow" : "warn",
      confidence: 1 - evaluation.groundedRatio,
      reasoning: evaluation.reasoning,
      classifierVersion: this.version,
      latencyMs: 0, // set by caller
      model: "claude-haiku-4-5-20251001",
    };
  }

  async evaluate(
    responseText: string,
    context?: unknown[],
  ): Promise<GroundingEvaluation> {
    const startTime = Date.now();

    try {
      const userPrompt = this.buildEvalPrompt(responseText, context);

      const { object } = await connectionPool.withAnthropicAISdkClient(
        async (anthropic) =>
          generateObject({
            model: anthropic("claude-haiku-4-5-20251001"),
            schema: GROUNDING_SCHEMA,
            system: SYSTEM_PROMPT,
            prompt: userPrompt,
            temperature: 0,
          }),
      );

      const latencyMs = Date.now() - startTime;

      logger.info("Grounding evaluation complete", {
        component: "GroundingClassifier",
        overallGrounded: object.overallGrounded,
        groundedRatio: object.groundedRatio,
        ungroundedClaimCount: object.ungroundedClaims.length,
        latencyMs,
      });

      return object;
    } catch (error) {
      logger.error(
        "Grounding classifier failed",
        { component: "GroundingClassifier" },
        error as Error,
      );

      // Fail-open: assume grounded on error
      return {
        overallGrounded: true,
        groundedRatio: 1.0,
        ungroundedClaims: [],
        reasoning: "Grounding evaluation failed — defaulting to grounded",
      };
    }
  }

  private buildEvalPrompt(responseText: string, context?: unknown[]): string {
    const parts: string[] = [];

    if (context && context.length > 0) {
      const contextText = context
        .map((c) => (typeof c === "string" ? c : JSON.stringify(c)))
        .join("\n---\n");
      parts.push(`<available_context>\n${contextText}\n</available_context>`);
    } else {
      parts.push(
        "<available_context>\nNo context/sources were provided to the assistant.\n</available_context>",
      );
    }

    parts.push(`<assistant_response>\n${responseText}\n</assistant_response>`);

    return parts.join("\n\n");
  }
}
