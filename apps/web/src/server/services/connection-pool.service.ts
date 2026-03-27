import { logger } from "@/lib/logger";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

/**
 * Connection Pool Service for External API Clients
 *
 * Manages pools of OpenAI and Anthropic API clients with:
 * - Round-robin load balancing
 * - Automatic retry with exponential backoff
 * - Metrics tracking (active connections, pool utilization)
 *
 * Note: Provider-level failure detection is handled by the circuit breaker service.
 */

// Retry configuration for connection pool operations
// Note: These differ from workflow retry delays (1s, 5s, 15s) in convert-recording/types.ts
// This pool uses faster retries (1s, 2s, 4s) for API calls that should fail fast
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
const POOL_SIZE = 5;

interface PooledClient<T> {
  client: T;
  activeRequests: number;
}

interface OpenAIClientPair {
  aiSdkClient: ReturnType<typeof createOpenAI>;
  rawClient: OpenAI;
}

interface AnthropicClientPair {
  aiSdkClient: ReturnType<typeof createAnthropic>;
  rawClient: Anthropic;
}

interface PoolMetrics {
  totalClients: number;
  activeConnections: number;
  poolUtilization: number; // Percentage
}

export class ConnectionPoolService {
  private static instance: ConnectionPoolService | null = null;
  private openaiPool: PooledClient<OpenAIClientPair>[] = [];
  private anthropicPool: PooledClient<AnthropicClientPair>[] = [];
  private currentOpenAI = 0;
  private currentAnthropic = 0;

  private constructor() {
    this.initializePools();
  }

  /**
   * Get singleton instance of ConnectionPoolService
   */
  static getInstance(): ConnectionPoolService {
    ConnectionPoolService.instance ??= new ConnectionPoolService();
    return ConnectionPoolService.instance;
  }

  /**
   * Initialize connection pools
   */
  private initializePools(): void {
    const openaiApiKey = process.env.OPENAI_API_KEY ?? "";
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";

    if (!openaiApiKey) {
      logger.warn("OPENAI_API_KEY not configured, OpenAI pool will be empty", {
        component: "ConnectionPoolService",
      });
    }

    if (!anthropicApiKey) {
      logger.warn(
        "ANTHROPIC_API_KEY not configured, Anthropic pool will be empty",
        {
          component: "ConnectionPoolService",
        },
      );
    }

    // Initialize OpenAI pool
    for (let i = 0; i < POOL_SIZE; i++) {
      if (openaiApiKey) {
        const rawClient = new OpenAI({
          apiKey: openaiApiKey,
        });
        const aiSdkClient = createOpenAI({
          apiKey: openaiApiKey,
        });
        this.openaiPool.push({
          client: {
            aiSdkClient,
            rawClient,
          },
          activeRequests: 0,
        });
      }
    }

    // Initialize Anthropic pool
    for (let i = 0; i < POOL_SIZE; i++) {
      if (anthropicApiKey) {
        const rawClient = new Anthropic({
          apiKey: anthropicApiKey,
        });
        const aiSdkClient = createAnthropic({
          apiKey: anthropicApiKey,
        });
        this.anthropicPool.push({
          client: {
            aiSdkClient,
            rawClient,
          },
          activeRequests: 0,
        });
      }
    }

    logger.info("Connection pools initialized", {
      component: "ConnectionPoolService",
      openaiPoolSize: this.openaiPool.length,
      anthropicPoolSize: this.anthropicPool.length,
    });
  }

  /**
   * Get next OpenAI client from pool (round-robin)
   */
  private getNextOpenAIClient(): PooledClient<OpenAIClientPair> {
    if (this.openaiPool.length === 0) {
      throw new Error(
        "OpenAI pool is empty. Check OPENAI_API_KEY configuration.",
      );
    }

    const client = this.openaiPool[this.currentOpenAI];
    this.currentOpenAI = (this.currentOpenAI + 1) % this.openaiPool.length;
    return client;
  }

  /**
   * Get OpenAI AI SDK client from pool (round-robin)
   * Use this for streamText and other AI SDK functions
   * @deprecated Use withOpenAIClient instead to track active requests
   */
  getOpenAIClient(): ReturnType<typeof createOpenAI> {
    const pooled = this.getNextOpenAIClient();
    return pooled.client.aiSdkClient;
  }

  /**
   * Execute operation with OpenAI AI SDK client, tracking active requests
   * This method properly tracks activeRequests for metrics
   */
  async withOpenAIClient<T>(
    fn: (client: ReturnType<typeof createOpenAI>) => Promise<T>,
  ): Promise<T> {
    const pooled = this.getNextOpenAIClient();
    pooled.activeRequests++;
    try {
      return await fn(pooled.client.aiSdkClient);
    } finally {
      pooled.activeRequests--;
    }
  }

  /**
   * Get OpenAI AI SDK client with manual request tracking for streaming
   * Returns the client and a cleanup function to decrement activeRequests
   * Use this for streaming operations where you need to track requests manually
   */
  getOpenAIClientWithTracking(): {
    client: ReturnType<typeof createOpenAI>;
    pooled: PooledClient<OpenAIClientPair>;
  } {
    const pooled = this.getNextOpenAIClient();
    pooled.activeRequests++;
    return {
      client: pooled.client.aiSdkClient,
      pooled,
    };
  }

  /**
   * Get raw OpenAI client from pool (round-robin)
   * Use this for embeddings and direct API calls
   */
  getRawOpenAIClient(): OpenAI {
    const pooled = this.getNextOpenAIClient();
    return pooled.client.rawClient;
  }

  /**
   * Execute operation with raw OpenAI client, tracking active requests
   * This method properly tracks activeRequests for metrics
   */
  async withRawOpenAIClient<T>(fn: (client: OpenAI) => Promise<T>): Promise<T> {
    const pooled = this.getNextOpenAIClient();
    pooled.activeRequests++;
    try {
      return await fn(pooled.client.rawClient);
    } finally {
      pooled.activeRequests--;
    }
  }

  /**
   * Get next Anthropic client from pool (round-robin)
   */
  private getNextAnthropicClient(): PooledClient<AnthropicClientPair> {
    if (this.anthropicPool.length === 0) {
      throw new Error(
        "Anthropic pool is empty. Check ANTHROPIC_API_KEY configuration.",
      );
    }

    const client = this.anthropicPool[this.currentAnthropic];
    this.currentAnthropic =
      (this.currentAnthropic + 1) % this.anthropicPool.length;
    return client;
  }

  /**
   * Get raw Anthropic client from pool (round-robin)
   * @deprecated Use withAnthropicRawClient instead to track active requests
   */
  getAnthropicClient(): Anthropic {
    const pooled = this.getNextAnthropicClient();
    return pooled.client.rawClient;
  }

  /**
   * Execute operation with raw Anthropic client, tracking active requests
   */
  async withAnthropicClient<T>(
    fn: (client: Anthropic) => Promise<T>,
  ): Promise<T> {
    const pooled = this.getNextAnthropicClient();
    pooled.activeRequests++;
    try {
      return await fn(pooled.client.rawClient);
    } finally {
      pooled.activeRequests--;
    }
  }

  /**
   * Get Anthropic AI SDK client from pool (round-robin)
   * Use this for streamText and other Vercel AI SDK functions
   * @deprecated Use withAnthropicAISdkClient instead to track active requests
   */
  getAnthropicAISdkClient(): ReturnType<typeof createAnthropic> {
    const pooled = this.getNextAnthropicClient();
    return pooled.client.aiSdkClient;
  }

  /**
   * Execute operation with Anthropic AI SDK client, tracking active requests
   * Use this for generateText, streamText, generateObject, etc.
   */
  async withAnthropicAISdkClient<T>(
    fn: (client: ReturnType<typeof createAnthropic>) => Promise<T>,
  ): Promise<T> {
    const pooled = this.getNextAnthropicClient();
    pooled.activeRequests++;
    try {
      return await fn(pooled.client.aiSdkClient);
    } finally {
      pooled.activeRequests--;
    }
  }

  /**
   * Get Anthropic AI SDK client with manual request tracking for streaming
   * Returns the client and pooled entry for manual activeRequests management
   */
  getAnthropicAISdkClientWithTracking(): {
    client: ReturnType<typeof createAnthropic>;
    pooled: PooledClient<AnthropicClientPair>;
  } {
    const pooled = this.getNextAnthropicClient();
    pooled.activeRequests++;
    return {
      client: pooled.client.aiSdkClient,
      pooled,
    };
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    serviceName: "openai" | "anthropic" = "openai",
    retryCount = 0,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = this.isRetryableError(error);

      if (isRetryable && retryCount < MAX_RETRIES) {
        const delay =
          RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

        const err = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `${serviceName} operation failed, retrying...`,
          {
            component: "ConnectionPoolService",
            serviceName,
            retryCount: retryCount + 1,
            maxRetries: MAX_RETRIES,
            delayMs: delay,
          },
          err,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, serviceName, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;

    // Network errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnreset") ||
        message.includes("enotfound")
      ) {
        return true;
      }
    }

    // Rate limit errors (429)
    if (
      typeof error === "object" &&
      "status" in error &&
      error.status === 429
    ) {
      return true;
    }

    // Service unavailable (503)
    if (
      typeof error === "object" &&
      "status" in error &&
      error.status === 503
    ) {
      return true;
    }

    // OpenAI/Anthropic SDK specific errors
    if (
      typeof error === "object" &&
      "code" in error &&
      (error.code === "rate_limit_exceeded" ||
        error.code === "server_error" ||
        error.code === "timeout")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get metrics for OpenAI pool
   */
  getOpenAIMetrics(): PoolMetrics {
    const activeConnections = this.openaiPool.reduce(
      (sum, c) => sum + c.activeRequests,
      0,
    );
    const poolUtilization =
      this.openaiPool.length > 0
        ? (activeConnections / (this.openaiPool.length * 10)) * 100 // Assuming max 10 concurrent requests per client
        : 0;

    return {
      totalClients: this.openaiPool.length,
      activeConnections,
      poolUtilization: Math.min(100, Math.max(0, poolUtilization)),
    };
  }

  /**
   * Get metrics for Anthropic pool
   */
  getAnthropicMetrics(): PoolMetrics {
    const activeConnections = this.anthropicPool.reduce(
      (sum, c) => sum + c.activeRequests,
      0,
    );
    const poolUtilization =
      this.anthropicPool.length > 0
        ? (activeConnections / (this.anthropicPool.length * 10)) * 100
        : 0;

    return {
      totalClients: this.anthropicPool.length,
      activeConnections,
      poolUtilization: Math.min(100, Math.max(0, poolUtilization)),
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): {
    openai: PoolMetrics;
    anthropic: PoolMetrics;
  } {
    return {
      openai: this.getOpenAIMetrics(),
      anthropic: this.getAnthropicMetrics(),
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Reset pools
    this.openaiPool = [];
    this.anthropicPool = [];
    ConnectionPoolService.instance = null;
  }
}

// Export singleton instance
export const connectionPool = ConnectionPoolService.getInstance();
