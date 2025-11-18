import { logger } from "@/lib/logger";
import { createOpenAI } from "@ai-sdk/openai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

/**
 * Connection Pool Service for External API Clients
 *
 * Manages pools of OpenAI and Anthropic API clients with:
 * - Round-robin load balancing
 * - Automatic retry with exponential backoff
 * - Health checks for pooled connections
 * - Metrics tracking (active connections, pool utilization)
 */

// Retry configuration for connection pool operations
// Note: These differ from workflow retry delays (1s, 5s, 15s) in convert-recording/types.ts
// This pool uses faster retries (1s, 2s, 4s) for API calls that should fail fast
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s
const POOL_SIZE = 5;
const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds

interface PooledClient<T> {
  client: T;
  isHealthy: boolean;
  lastHealthCheck: number;
  activeRequests: number;
}

interface OpenAIClientPair {
  aiSdkClient: ReturnType<typeof createOpenAI>;
  rawClient: OpenAI;
}

interface PoolMetrics {
  totalClients: number;
  healthyClients: number;
  activeConnections: number;
  poolUtilization: number; // Percentage
}

export class ConnectionPoolService {
  private static instance: ConnectionPoolService | null = null;
  private openaiPool: PooledClient<OpenAIClientPair>[] = [];
  private anthropicPool: PooledClient<Anthropic>[] = [];
  private currentOpenAI = 0;
  private currentAnthropic = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializePools();
    this.startHealthChecks();
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
        }
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
          isHealthy: true,
          lastHealthCheck: Date.now(),
          activeRequests: 0,
        });
      }
    }

    // Initialize Anthropic pool
    for (let i = 0; i < POOL_SIZE; i++) {
      if (anthropicApiKey) {
        const client = new Anthropic({
          apiKey: anthropicApiKey,
        });
        this.anthropicPool.push({
          client,
          isHealthy: true,
          lastHealthCheck: Date.now(),
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
   * Get next healthy OpenAI client from pool (round-robin)
   * Internal helper for selecting clients
   */
  private getNextHealthyOpenAIClient(): PooledClient<OpenAIClientPair> {
    if (this.openaiPool.length === 0) {
      throw new Error(
        "OpenAI pool is empty. Check OPENAI_API_KEY configuration."
      );
    }

    // Find next healthy client using round-robin
    let attempts = 0;
    while (attempts < this.openaiPool.length) {
      const client = this.openaiPool[this.currentOpenAI];
      this.currentOpenAI = (this.currentOpenAI + 1) % this.openaiPool.length;

      if (client.isHealthy) {
        return client;
      }

      attempts++;
    }

    // If no healthy client found, return first client anyway (will retry)
    logger.warn("No healthy OpenAI clients found, using first client", {
      component: "ConnectionPoolService",
    });
    return this.openaiPool[0];
  }

  /**
   * Get OpenAI AI SDK client from pool (round-robin)
   * Use this for streamText and other AI SDK functions
   * @deprecated Use withOpenAIClient instead to track active requests
   */
  getOpenAIClient(): ReturnType<typeof createOpenAI> {
    const pooled = this.getNextHealthyOpenAIClient();
    return pooled.client.aiSdkClient;
  }

  /**
   * Execute operation with OpenAI AI SDK client, tracking active requests
   * This method properly tracks activeRequests for metrics
   */
  async withOpenAIClient<T>(
    fn: (client: ReturnType<typeof createOpenAI>) => Promise<T>
  ): Promise<T> {
    const pooled = this.getNextHealthyOpenAIClient();
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
    const pooled = this.getNextHealthyOpenAIClient();
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
    const pooled = this.getNextHealthyOpenAIClient();
    return pooled.client.rawClient;
  }

  /**
   * Execute operation with raw OpenAI client, tracking active requests
   * This method properly tracks activeRequests for metrics
   */
  async withRawOpenAIClient<T>(fn: (client: OpenAI) => Promise<T>): Promise<T> {
    const pooled = this.getNextHealthyOpenAIClient();
    pooled.activeRequests++;
    try {
      return await fn(pooled.client.rawClient);
    } finally {
      pooled.activeRequests--;
    }
  }

  /**
   * Get next healthy Anthropic client from pool (round-robin)
   * Internal helper for selecting clients
   */
  private getNextHealthyAnthropicClient(): PooledClient<Anthropic> {
    if (this.anthropicPool.length === 0) {
      throw new Error(
        "Anthropic pool is empty. Check ANTHROPIC_API_KEY configuration."
      );
    }

    // Find next healthy client using round-robin
    let attempts = 0;
    while (attempts < this.anthropicPool.length) {
      const client = this.anthropicPool[this.currentAnthropic];
      this.currentAnthropic =
        (this.currentAnthropic + 1) % this.anthropicPool.length;

      if (client.isHealthy) {
        return client;
      }

      attempts++;
    }

    // If no healthy client found, return first client anyway (will retry)
    logger.warn("No healthy Anthropic clients found, using first client", {
      component: "ConnectionPoolService",
    });
    return this.anthropicPool[0];
  }

  /**
   * Get Anthropic client from pool (round-robin)
   * @deprecated Use withAnthropicClient instead to track active requests
   */
  getAnthropicClient(): Anthropic {
    const pooled = this.getNextHealthyAnthropicClient();
    return pooled.client;
  }

  /**
   * Execute operation with Anthropic client, tracking active requests
   * This method properly tracks activeRequests for metrics
   */
  async withAnthropicClient<T>(
    fn: (client: Anthropic) => Promise<T>
  ): Promise<T> {
    const pooled = this.getNextHealthyAnthropicClient();
    pooled.activeRequests++;
    try {
      return await fn(pooled.client);
    } finally {
      pooled.activeRequests--;
    }
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    serviceName: "openai" | "anthropic" = "openai",
    retryCount = 0
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
          err
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, serviceName, retryCount + 1);
      }

      // Mark client as unhealthy if error persists
      if (retryCount >= MAX_RETRIES) {
        this.markClientUnhealthy(serviceName, error);
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
   * Mark a client as unhealthy
   * Note: Currently marks the first client as unhealthy since we don't track
   * which specific client was used in executeWithRetry. For per-client tracking,
   * use withOpenAIClient/withRawOpenAIClient/withAnthropicClient wrappers instead.
   */
  private markClientUnhealthy(
    serviceName: "openai" | "anthropic",
    error: unknown
  ): void {
    const pool =
      serviceName === "openai" ? this.openaiPool : this.anthropicPool;

    // Mark all clients as potentially unhealthy if we've exhausted retries
    // In a more sophisticated implementation, we'd track which specific client failed
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      `${serviceName} client marked as unhealthy`,
      {
        component: "ConnectionPoolService",
        serviceName,
      },
      err
    );

    // Mark first client as unhealthy (simplified - in production, track per-client)
    if (pool.length > 0) {
      pool[0].isHealthy = false;
      pool[0].lastHealthCheck = Date.now();
    }
  }

  /**
   * Perform health check on a client
   */
  private async checkClientHealth<T>(
    client: PooledClient<T>,
    serviceName: "openai" | "anthropic"
  ): Promise<boolean> {
    try {
      // For OpenAI, we can't easily test without making an API call
      // For Anthropic, same issue
      // In production, you might want to implement a lightweight health check
      // For now, we'll mark clients as healthy if they haven't failed recently
      const timeSinceLastCheck = Date.now() - client.lastHealthCheck;

      // If client was marked unhealthy more than 5 minutes ago, try to recover
      if (!client.isHealthy && timeSinceLastCheck > 300000) {
        logger.info(`Attempting to recover ${serviceName} client`, {
          component: "ConnectionPoolService",
          serviceName,
        });
        client.isHealthy = true;
      }

      client.lastHealthCheck = Date.now();
      return client.isHealthy;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn(
        `Health check failed for ${serviceName} client`,
        {
          component: "ConnectionPoolService",
          serviceName,
        },
        err
      );
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch((error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          "Error during health checks",
          {
            component: "ConnectionPoolService",
          },
          err
        );
      });
    }, HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health checks on all clients
   */
  private async performHealthChecks(): Promise<void> {
    const openaiPromises = this.openaiPool.map((client) =>
      this.checkClientHealth(client, "openai")
    );
    const anthropicPromises = this.anthropicPool.map((client) =>
      this.checkClientHealth(client, "anthropic")
    );

    await Promise.all([...openaiPromises, ...anthropicPromises]);

    logger.debug("Health checks completed", {
      component: "ConnectionPoolService",
      openaiHealthy: this.openaiPool.filter((c) => c.isHealthy).length,
      openaiTotal: this.openaiPool.length,
      anthropicHealthy: this.anthropicPool.filter((c) => c.isHealthy).length,
      anthropicTotal: this.anthropicPool.length,
    });
  }

  /**
   * Get metrics for OpenAI pool
   */
  getOpenAIMetrics(): PoolMetrics {
    const healthyClients = this.openaiPool.filter((c) => c.isHealthy).length;
    const activeConnections = this.openaiPool.reduce(
      (sum, c) => sum + c.activeRequests,
      0
    );
    const poolUtilization =
      this.openaiPool.length > 0
        ? (activeConnections / (this.openaiPool.length * 10)) * 100 // Assuming max 10 concurrent requests per client
        : 0;

    return {
      totalClients: this.openaiPool.length,
      healthyClients,
      activeConnections,
      poolUtilization: Math.min(100, Math.max(0, poolUtilization)),
    };
  }

  /**
   * Get metrics for Anthropic pool
   */
  getAnthropicMetrics(): PoolMetrics {
    const healthyClients = this.anthropicPool.filter((c) => c.isHealthy).length;
    const activeConnections = this.anthropicPool.reduce(
      (sum, c) => sum + c.activeRequests,
      0
    );
    const poolUtilization =
      this.anthropicPool.length > 0
        ? (activeConnections / (this.anthropicPool.length * 10)) * 100
        : 0;

    return {
      totalClients: this.anthropicPool.length,
      healthyClients,
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
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
export const connectionPool = ConnectionPoolService.getInstance();

