import type {
  LanguageModelV3Middleware,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import OpenAI from "openai";

import { logger } from "@/lib/logger";

import { extractTextFromContent } from "./types";

let moderationClient: OpenAI | null = null;

function getModerationClient(): OpenAI | null {
  if (!moderationClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn("OPENAI_API_KEY not configured, output moderation will be skipped", {
        component: "OutputValidationMiddleware",
      });
      return null;
    }
    moderationClient = new OpenAI({ apiKey });
  }
  return moderationClient;
}

async function moderateText(text: string): Promise<{
  flagged: boolean;
  categories: string[];
}> {
  if (!text || text.length === 0) {
    return { flagged: false, categories: [] };
  }

  try {
    const client = getModerationClient();
    if (!client) {
      return { flagged: false, categories: [] };
    }

    const result = await client.moderations.create({
      model: "omni-moderation-latest",
      input: text.slice(0, 32_768),
    });

    const first = result.results[0];

    if (first?.flagged) {
      const flaggedCategories = Object.entries(first.categories)
        .filter(([, v]) => v)
        .map(([k]) => k);

      return { flagged: true, categories: flaggedCategories };
    }
  } catch (error) {
    logger.warn("Output moderation API call failed", {
      component: "OutputValidationMiddleware",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { flagged: false, categories: [] };
}

export function createOutputValidationMiddleware(): LanguageModelV3Middleware {
  return {
    specificationVersion: "v3",

    async wrapGenerate({ doGenerate }) {
      const result = await doGenerate();

      const fullText = extractTextFromContent(result.content);

      if (!fullText) {
        return result;
      }

      const moderation = await moderateText(fullText);

      if (moderation.flagged) {
        logger.security.suspiciousActivity("AI output flagged by moderation", {
          component: "OutputValidationMiddleware",
          categories: moderation.categories,
          outputLength: fullText.length,
        });

        const safeContent = result.content.map((block) => {
          if (block.type === "text") {
            return {
              ...block,
              text: "I'm sorry, but I'm unable to provide that response as it was flagged by our content safety system. Please try rephrasing your question.",
            };
          }
          return block;
        });

        return { ...result, content: safeContent };
      }

      return result;
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
              const fullText = textBlocks.get(chunk.id) ?? "";

              void moderateText(fullText).then((moderation) => {
                if (moderation.flagged) {
                  logger.security.suspiciousActivity(
                    "Streamed AI output flagged by moderation",
                    {
                      component: "OutputValidationMiddleware",
                      categories: moderation.categories,
                      blockId: chunk.id,
                      outputLength: fullText.length,
                    }
                  );
                }
              });

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

