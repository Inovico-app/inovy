import { logger } from "@/lib/logger";

/**
 * Password Breach Check Service
 *
 * Checks passwords against the Have I Been Pwned (HIBP) Passwords API
 * using the k-anonymity model. Only the first 5 characters of the SHA-1
 * hash are sent to the API — the full password hash never leaves the server.
 *
 * ISO 27001:2022 A.8.5 — Secure authentication
 * @see https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange
 */

const HIBP_API_URL = "https://api.pwnedpasswords.com/range/";

/**
 * Check if a password has been found in known data breaches.
 * Returns the number of times the password appeared in breaches,
 * or 0 if not found. Returns -1 on API errors (fail open).
 */
export async function checkBreachedPassword(password: string): Promise<number> {
  try {
    // Generate SHA-1 hash of the password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    // k-anonymity: send only first 5 chars of hash
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const response = await fetch(`${HIBP_API_URL}${prefix}`, {
      headers: {
        "User-Agent": "Inovy-ISMS-PasswordCheck",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.warn("HIBP API returned non-OK status", {
        component: "PasswordBreachCheck",
        status: response.status,
      });
      return -1; // Fail open
    }

    const text = await response.text();

    // Response format: SUFFIX:COUNT\r\n per line
    const lines = text.split("\r\n");
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(":");
      if (hashSuffix === suffix) {
        return parseInt(countStr ?? "0", 10);
      }
    }

    return 0; // Not found in breaches
  } catch (error) {
    logger.warn("Failed to check password against breach database", {
      component: "PasswordBreachCheck",
      error: error instanceof Error ? error.message : String(error),
    });
    return -1; // Fail open — don't block registration if API is down
  }
}
