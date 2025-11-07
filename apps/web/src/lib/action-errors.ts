/**
 * Smart error handling using neverthrow Result types
 * This provides structured error handling without custom error classes
 */

import type { Result } from "neverthrow";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE";

/**
 * Structured error information for Result types
 */
export interface ActionError {
  code: ErrorCode;
  message: string;
  cause?: Error | unknown;
  metadata?: Record<string, unknown>;
  context?: string; // Additional context about where the error occurred
}

/**
 * Standard Result type for service layer operations
 */
export type ActionResult<T> = Result<T, ActionError>;

/**
 * Helper function to create ActionError objects
 */
export function createActionError(
  code: ErrorCode,
  message: string,
  options?: {
    cause?: Error | unknown;
    metadata?: Record<string, unknown>;
    context?: string;
  }
): ActionError {
  return {
    code,
    message,
    cause: options?.cause,
    metadata: options?.metadata,
    context: options?.context,
  };
}

/**
 * Common error creators for frequent use cases
 */
export const ActionErrors = {
  unauthenticated: (message = "User is not authenticated", context?: string) =>
    createActionError("UNAUTHENTICATED", message, { context }),

  forbidden: (
    message = "User is not authorized to perform this action",
    metadata?: Record<string, unknown>,
    context?: string
  ) => createActionError("FORBIDDEN", message, { metadata, context }),

  notFound: (resource: string, context?: string) =>
    createActionError("NOT_FOUND", `${resource} not found`, { context }),

  badRequest: (message: string, context?: string) =>
    createActionError("BAD_REQUEST", message, { context }),

  conflict: (message: string, context?: string) =>
    createActionError("CONFLICT", message, { context }),

  validation: (message: string, metadata?: Record<string, unknown>) =>
    createActionError("VALIDATION_ERROR", message, { metadata }),

  internal: (
    message = "An internal server error occurred",
    cause?: Error | unknown,
    context?: string
  ) => createActionError("INTERNAL_SERVER_ERROR", message, { cause, context }),

  rateLimited: (message = "Too many requests", context?: string) =>
    createActionError("RATE_LIMITED", message, { context }),

  serviceUnavailable: (
    message = "Service temporarily unavailable",
    context?: string
  ) => createActionError("SERVICE_UNAVAILABLE", message, { context }),
};

