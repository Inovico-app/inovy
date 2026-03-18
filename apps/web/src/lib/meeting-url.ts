/**
 * Supported meeting platform hostnames.
 * Recall.ai handles joining the correct platform based on URL format.
 */
const SUPPORTED_MEETING_HOSTNAMES = [
  "meet.google.com",
  "teams.microsoft.com",
] as const;

/**
 * Validates whether a URL is a supported meeting platform link
 * (Google Meet or Microsoft Teams).
 */
export function isValidMeetingUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return SUPPORTED_MEETING_HOSTNAMES.includes(
      parsed.hostname as (typeof SUPPORTED_MEETING_HOSTNAMES)[number],
    );
  } catch {
    return false;
  }
}
