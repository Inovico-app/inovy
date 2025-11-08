/**
 * Enterprise-level logging utility for structured logging
 * Supports different log levels and structured data
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatLogEntry(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;

    if (this.isDevelopment) {
      // Pretty format for development
      let logString = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

      if (context && Object.keys(context).length > 0) {
        logString += `\n  Context: ${JSON.stringify(context, null, 2)}`;
      }

      if (error) {
        logString += `\n  Error: ${error.message}`;
        logString += `\n  Stack: ${error.stack}`;
      }

      return logString;
    } else {
      // JSON format for production (better for log aggregation)
      return JSON.stringify({
        ...entry,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : undefined,
      });
    }
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    const formattedLog = this.formatLogEntry(entry);

    // Route to appropriate console method
    switch (level) {
      case "debug":
        console.debug(formattedLog);
        break;
      case "info":
        console.info(formattedLog);
        break;
      case "warn":
        console.warn(formattedLog);
        break;
      case "error":
        console.error(formattedLog);
        break;
    }

    // In production, you might want to send logs to external service
    // like DataDog, Sentry, CloudWatch, etc.
    if (!this.isDevelopment && level === "error") {
      // TODO: Send to external logging service
      // e.g., sendToDataDog(entry);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log("warn", message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log("error", message, context, error);
  }

  // Helper method for auth-related logging
  auth = {
    sessionCheck: (success: boolean, context?: LogContext) => {
      this.info(`Auth session check: ${success ? "valid" : "invalid"}`, {
        ...context,
        component: "auth",
        action: "sessionCheck",
      });
    },

    loginAttempt: (context?: LogContext) => {
      this.info("User login attempt", {
        ...context,
        component: "auth",
        action: "login",
      });
    },

    logoutAttempt: (context?: LogContext) => {
      this.info("User logout attempt", {
        ...context,
        component: "auth",
        action: "logout",
      });
    },

    error: (message: string, error: Error, context?: LogContext) => {
      this.error(
        `Auth error: ${message}`,
        {
          ...context,
          component: "auth",
        },
        error
      );
    },
  };
}

export const logger = new Logger();

/**
 * Helper function to serialize errors for logging
 * Useful when passing errors as part of the context object
 */
export function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return error;
}

