import { randomUUID } from "crypto";
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        }
      : undefined,
});

/**
 * Generate a correlation ID for tracing operations
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Create a child logger with correlation ID
 */
export function createLogger(correlationId: string) {
  return logger.child({ correlationId });
}

