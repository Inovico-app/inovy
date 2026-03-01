import type {
  LanguageModelV3Middleware,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";

import { logger } from "@/lib/logger";
import { ChatAuditQueries } from "@/server/data-access/chat-audit.queries";
import type { NewChatAuditLog } from "@/server/db/schema/chat-audit-log";

import {
  extractLastUserMessage,
  extractTextFromContent,
  type GuardrailOptions,
} from "./types";

export function createAuditMiddleware(
  options: GuardrailOptions = {}
): LanguageModelV3Middleware {
  return {
    specificationVersion: "v3",

    async wrapGenerate({ doGenerate, params }) {
      const startTime = Date.now();
      const userMessage = extractLastUserMessage(params);
      const result = await doGenerate();
      const latencyMs = Date.now() - startTime;

      const outputText = extractTextFromContent(result.content);

      void logAuditEntry({
        options,
        input: userMessage,
        output: outputText,
        tokenUsage: {
          inputTokens: result.usage?.inputTokens?.total,
          outputTokens: result.usage?.outputTokens?.total,
        },
        latencyMs,
        requestType: options.requestType ?? "chat",
      });

      return result;
    },

    async wrapStream({ doStream, params }) {
      const startTime = Date.now();
      const userMessage = extractLastUserMessage(params);
      const { stream, ...rest } = await doStream();

      let generatedText = "";
      const textBlocks = new Map<string, string>();

      const transformStream = new TransformStream<
        LanguageModelV3StreamPart,
        LanguageModelV3StreamPart
      >({
        transform(chunk, controller) {
          switch (chunk.type) {
            case "text-start": {
              textBlocks.set(chunk.id, "");
              break;
            }
            case "text-delta": {
              const existing = textBlocks.get(chunk.id) ?? "";
              textBlocks.set(chunk.id, existing + chunk.delta);
              generatedText += chunk.delta;
              break;
            }
            case "text-end": {
              textBlocks.delete(chunk.id);
              break;
            }
          }

          controller.enqueue(chunk);
        },

        flush() {
          const latencyMs = Date.now() - startTime;

          void logAuditEntry({
            options,
            input: userMessage,
            output: generatedText,
            latencyMs,
            requestType: options.requestType ?? "chat",
          });
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}

async function logAuditEntry(params: {
  options: GuardrailOptions;
  input: string;
  output: string;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  latencyMs: number;
  requestType: string;
}): Promise<void> {
  const { options, input, output, tokenUsage, latencyMs, requestType } = params;

  if (!options.organizationId || !options.userId) {
    return;
  }

  try {
    const logEntry: NewChatAuditLog = {
      userId: options.userId,
      organizationId: options.organizationId,
      chatContext: options.chatContext ?? "project",
      projectId: options.projectId ?? null,
      action: "query_executed",
      query: input.slice(0, 10_000),
      ipAddress: null,
      userAgent: null,
      metadata: {
        guardrailAudit: true,
        responsePreview: output.slice(0, 2_000),
        responseLength: output.length,
        tokenUsage,
        latencyMs,
        requestType,
        conversationId: options.conversationId,
      },
    };

    await ChatAuditQueries.insert(logEntry);
  } catch (error) {
    logger.warn("Failed to write guardrail audit log", {
      component: "AuditMiddleware",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

