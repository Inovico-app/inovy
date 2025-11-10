/**
 * Cookie name for storing auto-process preference
 */
export const AUTO_PROCESS_COOKIE_NAME = "recording_auto_process_enabled";

/**
 * Get the auto-process preference from document.cookie (client-side)
 * Returns false by default (opt-in behavior)
 */
export function getAutoProcessPreferenceClient(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  try {
    const cookies = document.cookie.split(";");
    const autoProcessCookie = cookies.find((cookie) =>
      cookie.trim().startsWith(`${AUTO_PROCESS_COOKIE_NAME}=`)
    );

    if (!autoProcessCookie) {
      return false;
    }

    const value = autoProcessCookie.split("=")[1];
    return value === "true";
  } catch (error) {
    console.error("Failed to read auto-process preference from client:", error);
    return false;
  }
}

