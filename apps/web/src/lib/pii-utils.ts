import { createHmac } from "crypto";

/**
 * PII (Personally Identifiable Information) Utilities
 *
 * Provides functions to anonymize sensitive data for logging purposes.
 * These utilities ensure compliance with data protection regulations (GDPR, CCPA, etc.)
 * by preventing raw PII from being stored in logs.
 *
 * ## Usage
 *
 * Always use anonymized identifiers in log statements instead of raw PII:
 *
 * ```typescript
 * // ❌ Bad - logs raw email (PII)
 * logger.info("User signed in", { email: user.email });
 *
 * // ✅ Good - uses anonymized identifier
 * logger.info("User signed in", { emailHash: anonymizeEmail(user.email) });
 * ```
 *
 * ## Anonymization Strategy
 *
 * - Uses HMAC-SHA256 with a server-side secret for deterministic hashing
 * - Same input always produces the same anonymized output (useful for correlation)
 * - Returns a shortened hash (16 chars) prefixed with type for readability
 * - Secret is derived from BETTER_AUTH_SECRET or PII_ANONYMIZATION_SECRET env var
 *
 * ## Log Retention & Compliance
 *
 * - Logs containing anonymized PII should follow your organization's retention policy
 * - Anonymized identifiers cannot be reversed to original PII without the secret
 * - Ensure log storage complies with applicable data protection regulations
 * - Review and rotate PII_ANONYMIZATION_SECRET periodically
 */

/**
 * Get the secret key for PII anonymization
 * Uses BETTER_AUTH_SECRET as the HMAC key for deterministic hashing
 * Falls back to a default in development (should be set in production)
 */
function getPiiSecret(): string {
  return (
    process.env.BETTER_AUTH_SECRET ??
    process.env.PII_ANONYMIZATION_SECRET ??
    "default-dev-secret-change-in-production"
  );
}

/**
 * Anonymize an email address using HMAC-SHA256
 * Creates a deterministic hash that can be used for logging while protecting PII
 * The same email will always produce the same anonymized identifier
 *
 * @param email - The email address to anonymize
 * @returns A deterministic anonymized identifier (first 16 chars of HMAC-SHA256 hash)
 *
 * @example
 * anonymizeEmail("user@example.com") // Returns: "a1b2c3d4e5f6g7h8"
 */
export function anonymizeEmail(email: string | null | undefined): string {
  if (!email) {
    return "[no-email]";
  }

  const secret = getPiiSecret();
  const hash = createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");

  // Return first 16 characters for readability while maintaining uniqueness
  return `email_${hash.substring(0, 16)}`;
}

/**
 * Anonymize a user ID for logging
 * Uses SHA256 hash of the user ID
 *
 * @param userId - The user ID to anonymize
 * @returns A deterministic anonymized identifier
 */
export function anonymizeUserId(userId: string | null | undefined): string {
  if (!userId) {
    return "[no-user-id]";
  }

  const secret = getPiiSecret();
  const hash = createHmac("sha256", secret).update(userId).digest("hex");

  return `user_${hash.substring(0, 16)}`;
}

