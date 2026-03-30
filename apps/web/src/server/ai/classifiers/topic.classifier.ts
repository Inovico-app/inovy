import { logger } from "@/lib/logger";
import { generateObject } from "ai";
import { z } from "zod";

import { connectionPool } from "@/server/services/connection-pool.service";

import type { Classifier, ClassifierInput, ClassifierVerdict } from "./types";

const TOPIC_VERDICT_SCHEMA = z.object({
  classification: z.enum([
    "on-topic",
    "off-topic-benign",
    "dangerous",
    "self-harm",
  ]),
  confidence: z.number().min(0).max(1),
  category: z
    .enum([
      "malware-generation",
      "hacking",
      "weapons",
      "illegal-activities",
      "drug-manufacturing",
      "self-harm",
      "identity-fraud",
      "off-topic",
    ])
    .nullable(),
  reasoning: z.string(),
});

const CLASSIFICATION_TO_ACTION: Record<string, "allow" | "warn" | "block"> = {
  "on-topic": "allow",
  "off-topic-benign": "warn",
  dangerous: "block",
  "self-harm": "block",
};

const SYSTEM_PROMPT = `You are a content safety classifier for a meeting intelligence platform called Inovy. Users ask questions about their meeting recordings, transcriptions, summaries, and tasks.

Classify whether the message is:
- on-topic: Related to meetings, recordings, projects, tasks, summaries, or reasonable workplace questions
- off-topic-benign: Unrelated but harmless (e.g. "what's the weather", "tell me a joke")
- dangerous: Requests involving malware, hacking, weapons, illegal activity, drug manufacturing, identity fraud
- self-harm: Any mention of suicide, self-harm, or ending one's life

Be generous with on-topic. Users may ask tangential workplace questions — that's fine. Only flag genuinely dangerous or completely irrelevant requests.

IMPORTANT: Context matters. These are NOT dangerous:
- "How do I address self-harm policies in our HR meeting?" — workplace discussion
- "The hack we used to fix the deployment" — tech slang
- "We need to kill that feature" — business jargon
- "Can you crack open the recording from Monday?" — normal request

Language: Messages may be in Dutch, English, or mixed.

For dangerous or self-harm categories, also set the category field to the specific sub-category.

Respond with JSON only.`;

export class TopicClassifier implements Classifier {
  readonly name = "topic-classifier";
  readonly version = "1.0.0";
  readonly dimension = "topic" as const;

  async classify(input: ClassifierInput): Promise<ClassifierVerdict> {
    const startTime = Date.now();

    try {
      const { object } = await connectionPool.withAnthropicAISdkClient(
        async (anthropic) =>
          generateObject({
            model: anthropic("claude-haiku-4-5-20251001"),
            schema: TOPIC_VERDICT_SCHEMA,
            system: SYSTEM_PROMPT,
            prompt: `<message_to_classify>\n${input.text}\n</message_to_classify>`,
            temperature: 0,
          }),
      );

      const latencyMs = Date.now() - startTime;

      return {
        dimension: this.dimension,
        action: CLASSIFICATION_TO_ACTION[object.classification] ?? "allow",
        confidence: object.confidence,
        reasoning: object.reasoning,
        category: object.category ?? undefined,
        classifierVersion: this.version,
        latencyMs,
        model: "claude-haiku-4-5-20251001",
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logger.error(
        "Topic classifier failed",
        { component: "TopicClassifier", latencyMs },
        error as Error,
      );

      return {
        dimension: this.dimension,
        action: "allow",
        confidence: 0,
        reasoning: "Classifier error — defaulting to allow",
        classifierVersion: this.version,
        latencyMs,
        model: "claude-haiku-4-5-20251001",
      };
    }
  }
}
