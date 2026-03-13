/**
 * Server-only logger implementation using Pino
 * This file is in the server directory, which Next.js treats as server-only
 */

import type pino from "pino";

// Type for pino logger
type PinoLogger = {
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
  child: (bindings: Record<string, unknown>) => PinoLogger;
};

let pinoLogger: PinoLogger | null = null;

/**
 * SSD-30.3.01: Fallback console logger used when Pino initialization fails.
 * Ensures logging is never silently lost.
 */
function createFallbackLogger(): PinoLogger {
  const fallback: PinoLogger = {
    debug: (obj, msg) =>
      console.debug(
        `[FALLBACK] ${msg ?? ""}`,
        typeof obj === "string" ? obj : obj,
      ),
    info: (obj, msg) =>
      console.info(
        `[FALLBACK] ${msg ?? ""}`,
        typeof obj === "string" ? obj : obj,
      ),
    warn: (obj, msg) =>
      console.warn(
        `[FALLBACK] ${msg ?? ""}`,
        typeof obj === "string" ? obj : obj,
      ),
    error: (obj, msg) =>
      console.error(
        `[FALLBACK] ${msg ?? ""}`,
        typeof obj === "string" ? obj : obj,
      ),
    child: () => fallback,
  };
  return fallback;
}

/**
 * Initialize and return the pino logger instance
 * SSD-30.3.01: Falls back to console logger if Pino initialization fails
 */
export function getServerLogger(): PinoLogger {
  if (pinoLogger) {
    return pinoLogger;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pinoLib = require("pino") as typeof pino;

    // Determine log level from environment variable or default based on NODE_ENV
    const getLogLevel = (): pino.Level => {
      const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
      if (
        envLogLevel &&
        ["debug", "info", "warn", "error"].includes(envLogLevel)
      ) {
        return envLogLevel as pino.Level;
      }
      return process.env.NODE_ENV === "development" ? "debug" : "info";
    };

    const isDevelopment = process.env.NODE_ENV === "development";

    // Configure pino with environment-based settings
    const pinoConfig: pino.LoggerOptions = {
      level: getLogLevel(),
      formatters: {
        level: (label: string) => {
          return { level: label };
        },
      },
      timestamp: pinoLib.stdTimeFunctions.isoTime,
      // Redact sensitive fields and PII
      redact: {
        paths: [
          "password",
          "apiKey",
          "api_key",
          "token",
          "accessToken",
          "access_token",
          "refreshToken",
          "refresh_token",
          "secret",
          "secretKey",
          "secret_key",
          "authorization",
          "cookie",
          "sessionId",
          "session_id",
          "email", // Redact raw email addresses (use emailHash instead)
          "userEmail",
          "user_email",
          "emailAddress",
          "email_address",
        ],
        censor: "[Redacted]",
      },
      // Base context
      base: {
        env: process.env.NODE_ENV,
        pid: process.pid,
      },
      browser: {
        asObject: true,
      },
    };

    // In development, use pino-pretty for readable output
    // In production, use JSON output for log aggregation
    if (isDevelopment) {
      // Use pino-pretty transport in development
      pinoLogger = pinoLib(
        {
          ...pinoConfig,
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              singleLine: false,
            },
          },
        },
        pinoLib.destination({ sync: false }),
      ) as PinoLogger;
    } else {
      // Use JSON output in production
      pinoLogger = pinoLib(
        pinoConfig,
        pinoLib.destination({ sync: false }),
      ) as PinoLogger;
    }

    return pinoLogger;
  } catch (error) {
    // SSD-30.3.01: If Pino fails to initialize, fall back to console logger
    console.error(
      "[LOGGER] Pino initialization failed, using console fallback:",
      error,
    );
    pinoLogger = createFallbackLogger();
    return pinoLogger;
  }
}

export type { PinoLogger };
