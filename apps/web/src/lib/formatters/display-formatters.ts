/**
 * Display formatting utilities
 * Extracted from components for separation of concerns
 */

/**
 * Get creator display name from name and email
 * Falls back to email if name is not available
 * @param creatorName - Creator's full name (can be null)
 * @param creatorEmail - Creator's email (can be null)
 * @returns Display name string
 */
export function getCreatorDisplayName(
  creatorName: string | null,
  creatorEmail: string | null
): string {
  if (creatorName) {
    return creatorName;
  }
  if (creatorEmail) {
    return creatorEmail;
  }
  return "Unknown";
}

/**
 * Format user name from given name and family name
 * @param givenName - User's given name (can be null)
 * @param familyName - User's family name (can be null)
 * @returns Full name string
 */
export function formatUserName(
  givenName: string | null,
  familyName: string | null
): string {
  const parts = [givenName, familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Unknown";
}

