/**
 * Enterprise-level logging utility for structured logging using Pino
 * Supports different log levels and structured data
 */

import pino from "pino";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  [key: string]: unknown;
}

// Determine log level from environment variable or default based on NODE_ENV
const getLogLevel = (): pino.Level => {
  const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLogLevel && ["debug", "info", "warn", "error"].includes(envLogLevel)) {
    return envLogLevel as pino.Level;
  }
  return process.env.NODE_ENV === "development" ? "debug" : "info";
};

// Create base pino logger instance
const isDevelopment = process.env.NODE_ENV === "development";

// Configure pino with environment-based settings
const pinoConfig: pino.LoggerOptions = {
  level: getLogLevel(),
  formatters: {
    level: (label: string) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
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
let pinoLogger: pino.Logger;

if (isDevelopment) {
  // Use pino-pretty transport in development
  pinoLogger = pino(
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
    pino.destination({ sync: false })
  );
} else {
  // Use JSON output in production
  pinoLogger = pino(pinoConfig, pino.destination({ sync: false }));
}

class Logger {
  private logger: pino.Logger;

  constructor(loggerInstance?: pino.Logger) {
    this.logger = loggerInstance ?? pinoLogger;
  }

  /**
   * Create a child logger with default context
   * This enables automatic context propagation without passing it in every call
   */
  child(bindings: Record<string, unknown>): Logger {
    return new Logger(this.logger.child(bindings));
  }

  debug(message: string, context?: LogContext): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  info(message: string, context?: LogContext): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    const logData: Record<string, unknown> = { ...context };
    if (error) {
      // Pino automatically serializes Error objects when passed in the 'err' field
      logData.err = error;
    }
    if (Object.keys(logData).length > 0) {
      this.logger.warn(logData, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    const logData: Record<string, unknown> = { ...context };
    if (error) {
      // Pino automatically serializes Error objects when passed in the 'err' field
      logData.err = error;
    }
    if (Object.keys(logData).length > 0) {
      this.logger.error(logData, message);
    } else {
      this.logger.error(message);
    }
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

  // Helper method for security and organization isolation logging
  security = {
    organizationViolation: (context: {
      resourceOrgId: string;
      userOrgId: string;
      context: string;
      reason: string;
      userId?: string;
      resourceId?: string;
    }) => {
      this.error("Organization isolation violation detected", {
        component: "security",
        action: "organizationViolation",
        resourceOrgId: context.resourceOrgId,
        userOrgId: context.userOrgId,
        violationContext: context.context,
        reason: context.reason,
        userId: context.userId,
        resourceId: context.resourceId,
        severity: "high",
      });
    },

    unauthorizedAccess: (context: {
      userId: string;
      resource: string;
      action: string;
      reason: string;
    }) => {
      this.warn("Unauthorized access attempt", {
        component: "security",
        action: "unauthorizedAccess",
        userId: context.userId,
        resource: context.resource,
        attemptedAction: context.action,
        reason: context.reason,
      });
    },

    suspiciousActivity: (message: string, context?: LogContext) => {
      this.warn(`Suspicious activity: ${message}`, {
        ...context,
        component: "security",
        action: "suspiciousActivity",
      });
    },
  };

  // Helper method for structured audit logging
  // This provides a consistent interface for audit log creation
  audit = {
    /**
     * Log an audit event
     * This is a convenience method that provides structured logging for audit events
     * Actual audit log entries should be created via AuditLogService.createAuditLog()
     */
    event: (
      eventType: string,
      context: {
        resourceType: string;
        resourceId?: string;
        userId: string;
        organizationId: string;
        action: string;
        metadata?: Record<string, unknown>;
      }
    ) => {
      this.info(`Audit event: ${eventType}`, {
        component: "audit",
        auditAction: "event",
        eventType,
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        userId: context.userId,
        organizationId: context.organizationId,
        action: context.action,
        metadata: context.metadata,
      });
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

