/**
 * Duration formatting utilities
 * Extracted from components for separation of concerns
 */

/**
 * Format duration in seconds to a human-readable string
 * @param seconds - Duration in seconds (can be null)
 * @returns Formatted duration string (e.g., "1h 23m 45s" or "23m 45s")
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) {
    return "Unknown";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format a timestamp in seconds to MM:SS (or H:MM:SS for 1h+)
 * @param seconds - Position in seconds
 * @returns Formatted timestamp string (e.g., "02:35" or "1:02:35")
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format duration in seconds to a compact string (e.g., "1:23:45" or "23:45")
 * @param seconds - Duration in seconds (can be null)
 * @returns Formatted duration string
 */
export function formatDurationCompact(seconds: number | null): string {
  if (!seconds) {
    return "0:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

