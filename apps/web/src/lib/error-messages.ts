/**
 * Error message generation utility
 * Provides user-friendly error messages based on error codes
 */

import type { ErrorCode } from "./server-action-client/action-errors";

/**
 * Generate application error messages in English
 */
export function generateApplicationErrorMessage(code: ErrorCode): string {
  switch (code) {
    case "UNAUTHENTICATED":
      return "You must be logged in to perform this action.";
    case "FORBIDDEN":
      return "You do not have permission to perform this action.";
    case "NOT_FOUND":
      return "The requested resource was not found.";
    case "BAD_REQUEST":
      return "The request is invalid. Please check your input and try again.";
    case "CONFLICT":
      return "This action conflicts with the current state. Please refresh and try again.";
    case "VALIDATION_ERROR":
      return "The provided data is invalid. Please check your input.";
    case "RATE_LIMITED":
      return "Too many requests. Please wait a moment and try again.";
    case "SERVICE_UNAVAILABLE":
      return "The service is temporarily unavailable. Please try again later.";
    case "INTERNAL_SERVER_ERROR":
    default:
      return "An unexpected error occurred. Please try again later.";
  }
}

