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
 * Initialize and return the pino logger instance
 */
export function getServerLogger(): PinoLogger {
  if (pinoLogger) {
    return pinoLogger;
  }

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
    // Redact sensitive fields
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
      ],
      censor: "[Redacted]",
    },
    // Base context
    base: {
      env: process.env.NODE_ENV,
      pid: process.pid,
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
      pinoLib.destination({ sync: false })
    ) as PinoLogger;
  } else {
    // Use JSON output in production
    pinoLogger = pinoLib(
      pinoConfig,
      pinoLib.destination({ sync: false })
    ) as PinoLogger;
  }

  return pinoLogger;
}

export type { PinoLogger };

