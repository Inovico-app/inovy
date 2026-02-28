import { logger } from "@/lib/logger";

const GUARDRAILS_BASE_URL =
  process.env.GUARDRAILS_BASE_URL ?? "http://localhost:8000";
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 2;
const CIRCUIT_OPEN_DURATION_MS = 30_000;

export interface ValidationResult {
  passed: boolean;
  validatedOutput: string | null;
  rawResponse: Record<string, unknown> | null;
  error?: string;
}

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

export class GuardrailsClientService {
  private static circuit: CircuitState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  private static checkCircuit(): boolean {
    if (!this.circuit.isOpen) return true;

    const elapsed = Date.now() - this.circuit.lastFailure;
    if (elapsed > CIRCUIT_OPEN_DURATION_MS) {
      this.circuit.isOpen = false;
      this.circuit.failures = 0;
      logger.info("Guardrails circuit breaker reset", {
        component: "GuardrailsClient",
      });
      return true;
    }

    return false;
  }

  private static recordFailure(): void {
    this.circuit.failures++;
    this.circuit.lastFailure = Date.now();
    if (this.circuit.failures >= 3) {
      this.circuit.isOpen = true;
      logger.warn("Guardrails circuit breaker opened after 3 failures", {
        component: "GuardrailsClient",
      });
    }
  }

  private static recordSuccess(): void {
    this.circuit.failures = 0;
    this.circuit.isOpen = false;
  }

  private static passThrough(text: string, reason: string): ValidationResult {
    logger.warn(`Guardrails pass-through: ${reason}`, {
      component: "GuardrailsClient",
    });
    return {
      passed: true,
      validatedOutput: text,
      rawResponse: null,
      error: reason,
    };
  }

  static async validate(
    guardName: string,
    text: string,
    retryCount = 0
  ): Promise<ValidationResult> {
    if (!this.checkCircuit()) {
      return this.passThrough(text, "Circuit breaker is open");
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    try {
      const response = await fetch(
        `${GUARDRAILS_BASE_URL}/guards/${guardName}/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            llmOutput: text,
            llmApi: "none",
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Guardrails server returned ${response.status}`);
      }

      const data = (await response.json()) as Record<string, unknown>;
      this.recordSuccess();

      const validationPassed =
        data.validation_passed === true || data.result === "pass";
      const validatedOutput =
        typeof data.validated_output === "string"
          ? data.validated_output
          : text;

      return {
        passed: validationPassed,
        validatedOutput,
        rawResponse: data,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      if (retryCount < MAX_RETRIES) {
        const delay = (retryCount + 1) * 500;
        await new Promise((r) => setTimeout(r, delay));
        return this.validate(guardName, text, retryCount + 1);
      }

      this.recordFailure();
      return this.passThrough(text, `Guardrails server unreachable: ${message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  static async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const response = await fetch(`${GUARDRAILS_BASE_URL}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}
