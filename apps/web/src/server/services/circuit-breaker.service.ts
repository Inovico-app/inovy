import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  resetTimeoutMs: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindowMs: 60_000,
  resetTimeoutMs: 30_000,
};

export class CircuitOpenError extends Error {
  constructor(public readonly provider: string) {
    super(`Circuit breaker is open for provider: ${provider}`);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures: number[] = [];
  private lastStateChange: number = Date.now();
  private readonly config: CircuitBreakerConfig;
  private readonly provider: string;

  constructor(provider: string, config?: Partial<CircuitBreakerConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    if (
      this.state === "open" &&
      Date.now() - this.lastStateChange >= this.config.resetTimeoutMs
    ) {
      this.transitionTo("half_open");
    }
    return this.state;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === "open") {
      throw new CircuitOpenError(this.provider);
    }
    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.state === "half_open") {
      this.transitionTo("closed");
    }
  }

  private recordFailure(): void {
    if (this.state === "half_open") {
      this.transitionTo("open");
      return;
    }
    const now = Date.now();
    this.failures.push(now);
    const windowStart = now - this.config.failureWindowMs;
    this.failures = this.failures.filter((t) => t > windowStart);
    if (this.failures.length >= this.config.failureThreshold) {
      this.transitionTo("open");
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === "closed") {
      this.failures = [];
    }
    logger.warn(`Circuit breaker ${this.provider}: ${oldState} → ${newState}`, {
      component: "CircuitBreaker",
      provider: this.provider,
      oldState,
      newState,
    });
    Sentry.addBreadcrumb({
      category: "circuit-breaker",
      message: `${this.provider}: ${oldState} → ${newState}`,
      level: "warning",
    });
  }
}

// Singleton instances per provider
export const anthropicCircuitBreaker = new CircuitBreaker("anthropic");
export const openaiCircuitBreaker = new CircuitBreaker("openai");
export const deepgramCircuitBreaker = new CircuitBreaker("deepgram");
