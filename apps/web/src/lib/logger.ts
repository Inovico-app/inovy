/**
 * Enterprise-level logging utility for structured logging
 * Uses Pino on the server side and console methods on the client side
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

// Type for pino logger (only used on server side)
type PinoLogger = {
  debug: (obj: Record<string, unknown> | string, msg?: string) => void;
  info: (obj: Record<string, unknown> | string, msg?: string) => void;
  warn: (obj: Record<string, unknown> | string, msg?: string) => void;
  error: (obj: Record<string, unknown> | string, msg?: string) => void;
  child: (bindings: Record<string, unknown>) => PinoLogger;
};

// Check if we're running in a browser environment
const isBrowser = typeof window !== "undefined";

/**
 * Lazy initialization function for pino logger
 * Dynamically imports the server logger only when needed on the server
 */
function getPinoLogger(): PinoLogger | null {
  // Early return if in browser
  if (isBrowser) {
    return null;
  }

  // Dynamic import of server logger - this prevents bundling in client
  // Using a try-catch to handle cases where the module can't be loaded
  // Using string concatenation to prevent static analysis
  try {
    // This will only execute on the server side
    // The server directory is treated as server-only by Next.js
    // Using string concatenation to prevent Turbopack from analyzing the require
    const serverLoggerPath = "../" + "server/" + "logger";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getServerLogger } = require(serverLoggerPath);
    return getServerLogger();
  } catch {
    // If server logger can't be loaded, return null
    return null;
  }
}

// Helper function to format context for console output
const formatContext = (context?: LogContext): string => {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }
  return ` ${JSON.stringify(context)}`;
};

// Helper function to format error for console output
const formatError = (error?: Error): string => {
  if (!error) {
    return "";
  }
  return `\nError: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
};

class Logger {
  private logger: PinoLogger | null;
  private isClient: boolean;

  constructor(loggerInstance?: PinoLogger) {
    this.isClient = isBrowser;
    if (this.isClient) {
      // Client-side: use console methods
      this.logger = null;
    } else {
      // Server-side: use pino (lazy initialization)
      this.logger = loggerInstance ?? getPinoLogger();
    }
  }

  /**
   * Create a child logger with default context
   * This enables automatic context propagation without passing it in every call
   */
  child(bindings: Record<string, unknown>): Logger {
    if (this.isClient) {
      // On client, return a new logger instance (context will be included in each call)
      return new Logger();
    }
    // Lazy initialize pino logger if needed
    const logger = this.logger ?? getPinoLogger();
    if (!logger) {
      return new Logger();
    }
    return new Logger(logger.child(bindings));
  }

  debug(message: string, context?: LogContext): void {
    if (this.isClient) {
      console.debug(`[DEBUG] ${message}${formatContext(context)}`);
    } else {
      // Lazy initialize pino logger if needed
      const logger = this.logger ?? getPinoLogger();
      if (!logger) {
        return;
      }
      if (context) {
        logger.debug(context, message);
      } else {
        logger.debug(message);
      }
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isClient) {
      console.info(`[INFO] ${message}${formatContext(context)}`);
    } else {
      // Lazy initialize pino logger if needed
      const logger = this.logger ?? getPinoLogger();
      if (!logger) {
        return;
      }
      if (context) {
        logger.info(context, message);
      } else {
        logger.info(message);
      }
    }
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (this.isClient) {
      console.warn(
        `[WARN] ${message}${formatContext(context)}${formatError(error)}`
      );
    } else {
      // Lazy initialize pino logger if needed
      const logger = this.logger ?? getPinoLogger();
      if (!logger) {
        return;
      }
      const logData: Record<string, unknown> = { ...context };
      if (error) {
        // Pino automatically serializes Error objects when passed in the 'err' field
        logData.err = error;
      }
      if (Object.keys(logData).length > 0) {
        logger.warn(logData, message);
      } else {
        logger.warn(message);
      }
    }
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (this.isClient) {
      console.error(
        `[ERROR] ${message}${formatContext(context)}${formatError(error)}`
      );
    } else {
      // Lazy initialize pino logger if needed
      const logger = this.logger ?? getPinoLogger();
      if (!logger) {
        return;
      }
      const logData: Record<string, unknown> = { ...context };
      if (error) {
        // Pino automatically serializes Error objects when passed in the 'err' field
        logData.err = error;
      }
      if (Object.keys(logData).length > 0) {
        logger.error(logData, message);
      } else {
        logger.error(message);
      }
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

