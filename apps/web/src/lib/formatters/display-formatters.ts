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

/**
 * Get user display name from email, given name, and family name
 * Falls back to email if name is not available
 * @param email - User's email (can be null)
 * @param given_name - User's given name (can be null)
 * @param family_name - User's family name (can be null)
 * @returns Display name string
 */
export function getUserDisplayName({
  email,
  given_name,
  family_name,
}: {
  email: string | null;
  given_name: string | null;
  family_name: string | null;
}): string {
  if (given_name && family_name) {
    return `${given_name} ${family_name}`;
  }
  if (given_name) {
    return given_name;
  }
  return email || "Unknown";
}

