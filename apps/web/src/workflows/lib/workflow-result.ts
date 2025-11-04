/**
 * Serializable Result Type for Workflows
 *
 * This module provides a serializable alternative to neverthrow's Result type.
 * All workflows must use serializable data structures (plain objects) to ensure
 * they can be properly serialized and persisted.
 *
 * Usage:
 * ```typescript
 * async function myWorkflowStep(): Promise<WorkflowResult<string>> {
 *   try {
 *     const data = await fetchData();
 *     return success(data);
 *   } catch (error) {
 *     return failure(error);
 *   }
 * }
 *
 * const result = await myWorkflowStep();
 * if (!result.success) {
 *   console.error(result.error);
 *   return;
 * }
 * console.log(result.value);
 * ```
 */

import type { Result } from "neverthrow";

/**
 * Serializable success result
 */
export interface WorkflowSuccess<T> {
  success: true;
  value: T;
}

/**
 * Serializable failure result
 */
export interface WorkflowFailure {
  success: false;
  error: string;
}

/**
 * Discriminated union representing either success or failure
 * This type is fully serializable (no methods, only data)
 */
export type WorkflowResult<T> = WorkflowSuccess<T> | WorkflowFailure;

/**
 * Creates a success result
 *
 * @param value - The success value
 * @returns A serializable success result
 */
export function success<T>(value: T): WorkflowSuccess<T> {
  return {
    success: true,
    value,
  };
}

/**
 * Creates a failure result
 *
 * @param error - Error message, Error object, or object with message property
 * @returns A serializable failure result
 */
export function failure(
  error: string | Error | { message: string }
): WorkflowFailure {
  if (typeof error === "string") {
    return { success: false, error };
  }
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: error.message };
}

/**
 * Type guard to check if result is a success
 *
 * @param result - The workflow result to check
 * @returns True if the result is a success
 */
export function isSuccess<T>(
  result: WorkflowResult<T>
): result is WorkflowSuccess<T> {
  return result.success === true;
}

/**
 * Type guard to check if result is a failure
 *
 * @param result - The workflow result to check
 * @returns True if the result is a failure
 */
export function isFailure<T>(
  result: WorkflowResult<T>
): result is WorkflowFailure {
  return result.success === false;
}

/**
 * Converts a neverthrow Result to a serializable WorkflowResult
 *
 * This is useful when calling services that return neverthrow Results
 * from within workflow steps that need serializable return values.
 *
 * @param result - A neverthrow Result
 * @returns A serializable WorkflowResult
 */
export function fromNeverthrow<T, E extends Error | string>(
  result: Result<T, E>
): WorkflowResult<T> {
  if (result.isOk()) {
    return success(result.value);
  }
  return failure(result.error);
}

