/**
 * Safe error response utilities for API routes
 * Prevents exposure of technical details like database errors, file paths, and stack traces
 */

import type { ActionError } from "./server-action-client/action-errors";
import { logger } from "./logger";
import { NextResponse } from "next/server";

/**
 * Get safe error message based on error code
 * Never expose technical details to the client
 */
function getSafeErrorMessage(code?: string): string {
  switch (code) {
    case "UNAUTHENTICATED":
      return "Unauthorized";
    case "FORBIDDEN":
      return "Forbidden";
    case "NOT_FOUND":
      return "Not found";
    case "BAD_REQUEST":
      return "Bad request";
    case "CONFLICT":
      return "Conflict";
    case "VALIDATION_ERROR":
      return "Invalid input";
    case "RATE_LIMITED":
      return "Too many requests";
    case "SERVICE_UNAVAILABLE":
      return "Service unavailable";
    case "INTERNAL_SERVER_ERROR":
    default:
      return "Internal server error";
  }
}

/**
 * Create a safe error response for API routes
 * Logs the full error details server-side but returns sanitized message to client
 */
export function createSafeErrorResponse(
  error: unknown,
  context: string,
  options?: {
    fallbackStatus?: number;
    fallbackMessage?: string;
  }
): NextResponse {
  const fallbackStatus = options?.fallbackStatus ?? 500;
  const fallbackMessage = options?.fallbackMessage ?? "Internal server error";

  // Log the full error server-side (without exposing it to the client)
  logger.error(`Error in ${context}`, {
    component: context,
    error: error instanceof Error ? error.message : String(error),
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  });

  // If it's an ActionError, use the code to determine the safe message
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    const actionError = error as ActionError;
    const safeMessage = getSafeErrorMessage(actionError.code);
    const statusCode = getStatusCodeFromErrorCode(actionError.code);
    return NextResponse.json({ error: safeMessage }, { status: statusCode });
  }

  // For all other errors, return generic message
  return NextResponse.json({ error: fallbackMessage }, { status: fallbackStatus });
}

/**
 * Create a safe validation error response
 * Only includes high-level validation failure message, not specific field errors
 */
export function createSafeValidationErrorResponse(
  context: string
): NextResponse {
  logger.warn(`Validation error in ${context}`, {
    component: context,
  });

  return NextResponse.json(
    { error: "Invalid request format" },
    { status: 400 }
  );
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCodeFromErrorCode(code: string): number {
  switch (code) {
    case "UNAUTHENTICATED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "BAD_REQUEST":
    case "VALIDATION_ERROR":
      return 400;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "SERVICE_UNAVAILABLE":
      return 503;
    case "INTERNAL_SERVER_ERROR":
    default:
      return 500;
  }
}

/**
 * Safe error response for ActionResult errors
 * Extracts the error code and returns appropriate HTTP response
 */
export function createSafeActionErrorResponse(
  actionError: ActionError,
  context: string
): NextResponse {
  // Log the full error server-side
  logger.error(`Action error in ${context}`, {
    component: context,
    code: actionError.code,
    errorContext: actionError.context,
    // Don't log cause as it might contain sensitive info
  });

  const safeMessage = getSafeErrorMessage(actionError.code);
  const statusCode = getStatusCodeFromErrorCode(actionError.code);

  return NextResponse.json({ error: safeMessage }, { status: statusCode });
}
