import { logger } from "@/lib/logger";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import {
  anthropicCircuitBreaker,
  CircuitOpenError,
  openaiCircuitBreaker,
} from "./circuit-breaker.service";
import { connectionPool } from "./connection-pool.service";

interface ExecuteResult<T> {
  result: T;
  provider: "anthropic" | "openai";
  modelId: string;
  isFallback: boolean;
}

interface StreamingModelResult {
  model: LanguageModelV3;
  provider: "anthropic" | "openai";
  modelId: string;
  isFallback: boolean;
  pooled: { activeRequests: number };
  reportOutcome: (success: boolean) => void;
}

const FALLBACK_MAP: Record<string, string> = {
  "claude-sonnet-4-6": "gpt-4o",
  "claude-opus-4-6": "gpt-4o",
  "claude-haiku-4-5-20251001": "gpt-4o-mini",
};

const DEFAULT_FALLBACK = "gpt-4o";

export class ResilientModelProvider {
  /**
   * Execute an AI operation with automatic provider fallback.
   * Tries Anthropic first; if circuit is open or call fails, falls back to OpenAI.
   */
  async execute<T>(
    modelId: string,
    operation: (model: LanguageModelV3) => Promise<T>,
  ): Promise<ExecuteResult<T>> {
    // Try primary (Anthropic)
    if (anthropicCircuitBreaker.getState() !== "open") {
      try {
        const result = await anthropicCircuitBreaker.execute(async () =>
          connectionPool.executeWithRetry(
            () =>
              connectionPool.withAnthropicAISdkClient(async (anthropic) => {
                const model = anthropic(modelId);
                return operation(model);
              }),
            "anthropic",
          ),
        );
        return { result, provider: "anthropic", modelId, isFallback: false };
      } catch (error) {
        if (!(error instanceof CircuitOpenError)) {
          logger.warn("Primary provider (Anthropic) failed, trying fallback", {
            component: "ResilientModelProvider",
            modelId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Fallback to OpenAI
    const fallbackModelId = ResilientModelProvider.getFallbackModelId(modelId);

    if (openaiCircuitBreaker.getState() === "open") {
      throw new Error(
        "All AI providers are currently unavailable. Please try again later.",
      );
    }

    try {
      const result = await openaiCircuitBreaker.execute(async () =>
        connectionPool.executeWithRetry(
          () =>
            connectionPool.withOpenAIClient(async (openai) => {
              const model = openai(fallbackModelId);
              return operation(model);
            }),
          "openai",
        ),
      );

      logger.info("Used fallback provider (OpenAI) successfully", {
        component: "ResilientModelProvider",
        primaryModelId: modelId,
        fallbackModelId,
      });

      return {
        result,
        provider: "openai",
        modelId: fallbackModelId,
        isFallback: true,
      };
    } catch {
      throw new Error(
        "All AI providers are currently unavailable. Please try again later.",
      );
    }
  }

  /**
   * Get a model for streaming operations (e.g. ChatPipeline).
   * Returns the model + a callback to report outcome to the circuit breaker.
   */
  getModelForStreaming(modelId: string): StreamingModelResult {
    if (anthropicCircuitBreaker.getState() !== "open") {
      const { client: anthropic, pooled } =
        connectionPool.getAnthropicAISdkClientWithTracking();
      return {
        model: anthropic(modelId),
        provider: "anthropic",
        modelId,
        isFallback: false,
        pooled,
        reportOutcome: (success: boolean) => {
          if (!success) {
            anthropicCircuitBreaker
              .execute(() => Promise.reject(new Error("stream-failure")))
              .catch(() => {});
          }
        },
      };
    }

    // Fallback
    const fallbackModelId = ResilientModelProvider.getFallbackModelId(modelId);

    if (openaiCircuitBreaker.getState() === "open") {
      throw new Error(
        "All AI providers are currently unavailable. Please try again later.",
      );
    }

    const { client: openai, pooled } =
      connectionPool.getOpenAIClientWithTracking();
    return {
      model: openai(fallbackModelId),
      provider: "openai",
      modelId: fallbackModelId,
      isFallback: true,
      pooled,
      reportOutcome: () => {},
    };
  }

  static getFallbackModelId(modelId: string): string {
    return FALLBACK_MAP[modelId] ?? DEFAULT_FALLBACK;
  }
}

export const resilientModelProvider = new ResilientModelProvider();
