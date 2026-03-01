import type { LanguageModelV3Middleware } from "@ai-sdk/provider";
import OpenAI from "openai";

import { logger } from "@/lib/logger";

import { extractLastUserMessage, GuardrailError } from "./types";

let moderationClient: OpenAI | null = null;

function getModerationClient(): OpenAI | null {
  if (!moderationClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn("OPENAI_API_KEY not configured, moderation checks will be skipped", {
        component: "InputModerationMiddleware",
      });
      return null;
    }
    moderationClient = new OpenAI({ apiKey });
  }
  return moderationClient;
}

export function createInputModerationMiddleware(): LanguageModelV3Middleware {
  return {
    specificationVersion: "v3",

    async transformParams({ params }) {
      const userMessage = extractLastUserMessage(params);

      if (!userMessage || userMessage.length === 0) {
        return params;
      }

      const truncated = userMessage.slice(0, 32_768);

      try {
        const client = getModerationClient();
        if (!client) {
          return params;
        }

        const result = await client.moderations.create({
          model: "omni-moderation-latest",
          input: truncated,
        });

        const flagged = result.results[0];

        if (flagged?.flagged) {
          const flaggedCategories = Object.entries(flagged.categories)
            .filter(([, v]) => v)
            .map(([k]) => k);

          logger.security.suspiciousActivity(
            "Content flagged by OpenAI Moderation API",
            {
              component: "InputModerationMiddleware",
              categories: flaggedCategories,
              inputLength: truncated.length,
            }
          );

          throw new GuardrailError({
            type: "moderation",
            severity: "block",
            message:
              "Your message was flagged by our content safety system. Please rephrase your request.",
            details: { categories: flaggedCategories },
          });
        }
      } catch (error) {
        if (error instanceof GuardrailError) {
          throw error;
        }

        // Fail-open: preserve availability when moderation API is unreachable.
        // GuardrailError (hard policy violations) is always re-thrown above.
        logger.warn(
          "OpenAI Moderation API call failed, proceeding without moderation",
          {
            component: "InputModerationMiddleware",
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }

      return params;
    },
  };
}

