import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";

// Mock dependencies before imports
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockAnthropicExecute = vi.fn();
const mockAnthropicGetState = vi.fn();
const mockOpenaiExecute = vi.fn();
const mockOpenaiGetState = vi.fn();

vi.mock("../circuit-breaker.service", () => ({
  anthropicCircuitBreaker: {
    execute: (...args: unknown[]) => mockAnthropicExecute(...args),
    getState: () => mockAnthropicGetState(),
  },
  openaiCircuitBreaker: {
    execute: (...args: unknown[]) => mockOpenaiExecute(...args),
    getState: () => mockOpenaiGetState(),
  },
  CircuitOpenError: class CircuitOpenError extends Error {
    constructor(public readonly provider: string) {
      super(`Circuit breaker is open for provider: ${provider}`);
      this.name = "CircuitOpenError";
    }
  },
}));

const mockExecuteWithRetry = vi.fn();
const mockWithAnthropicAISdkClient = vi.fn();
const mockWithOpenAIClient = vi.fn();
const mockGetAnthropicAISdkClientWithTracking = vi.fn();
const mockGetOpenAIClientWithTracking = vi.fn();

vi.mock("../connection-pool.service", () => ({
  connectionPool: {
    executeWithRetry: (...args: unknown[]) => mockExecuteWithRetry(...args),
    withAnthropicAISdkClient: (...args: unknown[]) =>
      mockWithAnthropicAISdkClient(...args),
    withOpenAIClient: (...args: unknown[]) => mockWithOpenAIClient(...args),
    getAnthropicAISdkClientWithTracking: () =>
      mockGetAnthropicAISdkClientWithTracking(),
    getOpenAIClientWithTracking: () => mockGetOpenAIClientWithTracking(),
  },
}));

describe("ResilientModelProvider", () => {
  // Import after mocks are set up
  let ResilientModelProvider: typeof import("../resilient-model-provider.service").ResilientModelProvider;
  let resilientModelProvider: InstanceType<typeof ResilientModelProvider>;

  beforeEach(async () => {
    vi.resetAllMocks();

    // Default: both circuits closed
    mockAnthropicGetState.mockReturnValue("closed");
    mockOpenaiGetState.mockReturnValue("closed");

    const mod = await import("../resilient-model-provider.service");
    ResilientModelProvider = mod.ResilientModelProvider;
    resilientModelProvider = new ResilientModelProvider();
  });

  describe("execute", () => {
    it("uses primary provider (Anthropic) when circuit is closed", async () => {
      mockAnthropicGetState.mockReturnValue("closed");
      mockAnthropicExecute.mockImplementation(
        async (fn: () => Promise<unknown>) => fn(),
      );
      mockExecuteWithRetry.mockImplementation(
        async (fn: () => Promise<unknown>) => fn(),
      );
      mockWithAnthropicAISdkClient.mockImplementation(
        async (
          fn: (client: (id: string) => LanguageModel) => Promise<unknown>,
        ) => {
          const fakeClient = (id: string) =>
            ({ modelId: id }) as unknown as LanguageModel;
          return fn(fakeClient);
        },
      );

      const operation = vi.fn().mockResolvedValue("anthropic-result");
      const result = await resilientModelProvider.execute(
        "claude-sonnet-4-6",
        operation,
      );

      expect(result.provider).toBe("anthropic");
      expect(result.modelId).toBe("claude-sonnet-4-6");
      expect(result.isFallback).toBe(false);
      expect(result.result).toBe("anthropic-result");
    });

    it("falls back to OpenAI when Anthropic circuit is open", async () => {
      mockAnthropicGetState.mockReturnValue("open");
      mockOpenaiGetState.mockReturnValue("closed");
      mockOpenaiExecute.mockImplementation(async (fn: () => Promise<unknown>) =>
        fn(),
      );
      mockExecuteWithRetry.mockImplementation(
        async (fn: () => Promise<unknown>) => fn(),
      );
      mockWithOpenAIClient.mockImplementation(
        async (
          fn: (client: (id: string) => LanguageModel) => Promise<unknown>,
        ) => {
          const fakeClient = (id: string) =>
            ({ modelId: id }) as unknown as LanguageModel;
          return fn(fakeClient);
        },
      );

      const operation = vi.fn().mockResolvedValue("openai-result");
      const result = await resilientModelProvider.execute(
        "claude-sonnet-4-6",
        operation,
      );

      expect(result.provider).toBe("openai");
      expect(result.modelId).toBe("gpt-4o");
      expect(result.isFallback).toBe(true);
      expect(result.result).toBe("openai-result");
    });

    it("falls back to OpenAI when Anthropic call fails", async () => {
      mockAnthropicGetState.mockReturnValue("closed");
      mockAnthropicExecute.mockRejectedValue(new Error("Anthropic API error"));
      mockOpenaiGetState.mockReturnValue("closed");
      mockOpenaiExecute.mockImplementation(async (fn: () => Promise<unknown>) =>
        fn(),
      );
      mockExecuteWithRetry.mockImplementation(
        async (fn: () => Promise<unknown>) => fn(),
      );
      mockWithOpenAIClient.mockImplementation(
        async (
          fn: (client: (id: string) => LanguageModel) => Promise<unknown>,
        ) => {
          const fakeClient = (id: string) =>
            ({ modelId: id }) as unknown as LanguageModel;
          return fn(fakeClient);
        },
      );

      const operation = vi.fn().mockResolvedValue("openai-fallback");
      const result = await resilientModelProvider.execute(
        "claude-sonnet-4-6",
        operation,
      );

      expect(result.provider).toBe("openai");
      expect(result.isFallback).toBe(true);
      expect(result.result).toBe("openai-fallback");
    });

    it("throws when both providers are down", async () => {
      mockAnthropicGetState.mockReturnValue("open");
      mockOpenaiGetState.mockReturnValue("open");

      const operation = vi.fn();
      await expect(
        resilientModelProvider.execute("claude-sonnet-4-6", operation),
      ).rejects.toThrow(
        "All AI providers are currently unavailable. Please try again later.",
      );
    });

    it("throws when Anthropic fails and OpenAI also fails", async () => {
      mockAnthropicGetState.mockReturnValue("closed");
      mockAnthropicExecute.mockRejectedValue(new Error("Anthropic down"));
      mockOpenaiGetState.mockReturnValue("closed");
      mockOpenaiExecute.mockRejectedValue(new Error("OpenAI down"));

      const operation = vi.fn();
      await expect(
        resilientModelProvider.execute("claude-sonnet-4-6", operation),
      ).rejects.toThrow(
        "All AI providers are currently unavailable. Please try again later.",
      );
    });
  });

  describe("getFallbackModelId", () => {
    it("maps claude-sonnet-4-6 to gpt-4o", () => {
      expect(
        ResilientModelProvider.getFallbackModelId("claude-sonnet-4-6"),
      ).toBe("gpt-4o");
    });

    it("maps claude-opus-4-6 to gpt-4o", () => {
      expect(ResilientModelProvider.getFallbackModelId("claude-opus-4-6")).toBe(
        "gpt-4o",
      );
    });

    it("maps claude-haiku-4-5-20251001 to gpt-4o-mini", () => {
      expect(
        ResilientModelProvider.getFallbackModelId("claude-haiku-4-5-20251001"),
      ).toBe("gpt-4o-mini");
    });

    it("defaults to gpt-4o for unknown models", () => {
      expect(
        ResilientModelProvider.getFallbackModelId("some-unknown-model"),
      ).toBe("gpt-4o");
    });
  });

  describe("getModelForStreaming", () => {
    it("returns Anthropic model when circuit is closed", () => {
      mockAnthropicGetState.mockReturnValue("closed");
      const fakeAnthropicClient = vi.fn(
        (id: string) => ({ modelId: id }) as unknown as LanguageModel,
      );
      mockGetAnthropicAISdkClientWithTracking.mockReturnValue({
        client: fakeAnthropicClient,
        pooled: { activeRequests: 1 },
      });

      const result =
        resilientModelProvider.getModelForStreaming("claude-sonnet-4-6");

      expect(result.provider).toBe("anthropic");
      expect(result.modelId).toBe("claude-sonnet-4-6");
      expect(result.isFallback).toBe(false);
      expect(result.model).toBeDefined();
      expect(fakeAnthropicClient).toHaveBeenCalledWith("claude-sonnet-4-6");
    });

    it("returns OpenAI fallback model when Anthropic circuit is open", () => {
      mockAnthropicGetState.mockReturnValue("open");
      mockOpenaiGetState.mockReturnValue("closed");
      const fakeOpenaiClient = vi.fn(
        (id: string) => ({ modelId: id }) as unknown as LanguageModel,
      );
      mockGetOpenAIClientWithTracking.mockReturnValue({
        client: fakeOpenaiClient,
        pooled: { activeRequests: 2 },
      });

      const result =
        resilientModelProvider.getModelForStreaming("claude-sonnet-4-6");

      expect(result.provider).toBe("openai");
      expect(result.modelId).toBe("gpt-4o");
      expect(result.isFallback).toBe(true);
      expect(result.model).toBeDefined();
      expect(fakeOpenaiClient).toHaveBeenCalledWith("gpt-4o");
    });

    it("throws when both providers are down", () => {
      mockAnthropicGetState.mockReturnValue("open");
      mockOpenaiGetState.mockReturnValue("open");

      expect(() =>
        resilientModelProvider.getModelForStreaming("claude-sonnet-4-6"),
      ).toThrow(
        "All AI providers are currently unavailable. Please try again later.",
      );
    });

    it("returns correct model and metadata", () => {
      mockAnthropicGetState.mockReturnValue("closed");
      const fakeModel = {
        modelId: "claude-sonnet-4-6",
      } as unknown as LanguageModel;
      const fakeClient = vi.fn().mockReturnValue(fakeModel);
      mockGetAnthropicAISdkClientWithTracking.mockReturnValue({
        client: fakeClient,
        pooled: { activeRequests: 3 },
      });

      const result =
        resilientModelProvider.getModelForStreaming("claude-sonnet-4-6");

      expect(result.model).toBe(fakeModel);
      expect(result.provider).toBe("anthropic");
      expect(result.modelId).toBe("claude-sonnet-4-6");
      expect(result.isFallback).toBe(false);
      expect(result.pooled).toEqual({ activeRequests: 3 });
      expect(typeof result.reportOutcome).toBe("function");
    });

    it("maps to correct fallback model for streaming", () => {
      mockAnthropicGetState.mockReturnValue("open");
      mockOpenaiGetState.mockReturnValue("closed");
      const fakeOpenaiClient = vi.fn(
        (id: string) => ({ modelId: id }) as unknown as LanguageModel,
      );
      mockGetOpenAIClientWithTracking.mockReturnValue({
        client: fakeOpenaiClient,
        pooled: { activeRequests: 0 },
      });

      const result = resilientModelProvider.getModelForStreaming(
        "claude-haiku-4-5-20251001",
      );

      expect(result.modelId).toBe("gpt-4o-mini");
      expect(fakeOpenaiClient).toHaveBeenCalledWith("gpt-4o-mini");
    });
  });
});
