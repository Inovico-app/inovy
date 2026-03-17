import { logger } from "@/lib/logger";

/**
 * Validate that a redirect URL is same-origin (relative path or matches app origin).
 * Returns the safe URL or falls back to a default.
 */
export function validateRedirectUrl(
  redirectUrl: string,
  requestUrl: string,
  fallback: string,
): string {
  try {
    const resolved = new URL(redirectUrl, requestUrl);
    const origin = new URL(requestUrl).origin;

    if (resolved.origin !== origin) {
      logger.warn("Redirect URL origin mismatch", { redirectUrl, origin });
      return fallback;
    }

    return resolved.pathname + resolved.search;
  } catch {
    return fallback;
  }
}
