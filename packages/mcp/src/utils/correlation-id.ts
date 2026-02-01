import { randomUUID } from "node:crypto";

/**
 * Generate a correlation ID for tracing operations
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

