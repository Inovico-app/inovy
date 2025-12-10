/**
 * Date formatting utilities
 * Extracted from components for separation of concerns
 */

/**
 * Format a date to a readable string
 * @param date - Date to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: {
    year?: "numeric" | "2-digit";
    month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
    day?: "numeric" | "2-digit";
  } = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  return date.toLocaleDateString("en-US", options);
}

/**
 * Format a date to a short format (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: Date): string {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date to a long format (e.g., "January 15, 2024")
 */
export function formatDateLong(date: Date): string {
  return formatDate(date, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

