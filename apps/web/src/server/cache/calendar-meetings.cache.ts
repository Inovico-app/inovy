import { CacheTags } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { cacheTag } from "next/cache";

/**
 * Cached calendar meetings queries
 * Uses Next.js 16 cache with tags for invalidation
 */

/**
 * Get cached calendar meetings for a date range
 * Fetches meetings from Google Calendar API with extended time range
 * Returns plain array (unwrapped from Result) for Next.js cache serialization
 * Rethrows errors so error boundaries can handle them
 */
export async function getCachedCalendarMeetings(
  userId: string,
  organizationId: string,
  timeMin: Date,
  timeMax: Date,
  calendarIds?: string[] | null
): Promise<CalendarEvent[]> {
  "use cache";
  cacheTag(CacheTags.calendarMeetings(userId, organizationId));

  logger.info("Fetching calendar meetings", {
    userId,
    organizationId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    calendarIds: calendarIds ?? ["primary"],
  });

  const result = await GoogleCalendarService.getUpcomingMeetings(userId, {
    timeMin,
    timeMax,
    calendarIds: calendarIds ?? undefined,
  });

  if (result.isErr()) {
    logger.error("Failed to fetch calendar meetings", {
      userId,
      organizationId,
      error: result.error,
    });
    // Rethrow error so error boundaries can handle it
    // Convert ActionError to Error for proper error boundary handling
    const error = new Error(result.error.message || "Failed to fetch calendar meetings");
    error.name = result.error.code || "CalendarMeetingsError";
    throw error;
  }

  logger.info("Successfully fetched calendar meetings", {
    userId,
    organizationId,
    count: result.value.length,
  });

  // Unwrap Result for Next.js cache serialization
  return result.value;
}

