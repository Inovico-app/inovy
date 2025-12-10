import { logger } from "@/lib/logger";

/**
 * Cookie name for storing live transcription preference
 */
export const LIVE_TRANSCRIPTION_COOKIE_NAME = "live_transcription_enabled";

/**
 * Get the live transcription preference from document.cookie (client-side)
 * Returns true by default (opt-out behavior)
 */
export function getLiveTranscriptionPreferenceClient(): boolean {
  if (typeof document === "undefined") {
    return true;
  }

  try {
    const cookies = document.cookie.split(";");
    const transcriptionCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${LIVE_TRANSCRIPTION_COOKIE_NAME}=`)
    );

    if (!transcriptionCookie) {
      return true; // Default to enabled
    }

    const value = transcriptionCookie.split("=")[1];
    return value === "true";
  } catch (error) {
    logger.error("Failed to read live transcription preference from client", {
      component: "live-transcription-preferences",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return true; // Default to enabled on error
  }
}

/**
 * Set the live transcription preference in document.cookie (client-side)
 * @param enabled - Whether live transcription should be enabled
 */
export function setLiveTranscriptionPreferenceClient(enabled: boolean): void {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    const cookieValue = `${LIVE_TRANSCRIPTION_COOKIE_NAME}=${enabled}; max-age=${maxAge}; path=/; samesite=strict${
      process.env.NODE_ENV === "production" ? "; secure" : ""
    }`;
    document.cookie = cookieValue;
  } catch (error) {
    logger.error("Failed to set live transcription preference", {
      component: "live-transcription-preferences",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw new Error("Failed to update live transcription preference");
  }
}

