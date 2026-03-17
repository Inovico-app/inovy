import { err, ok } from "neverthrow";
import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import type { MeetingLinkProvider } from "./meeting-link-provider";
import type { CalendarEvent, MeetingLink, MeetingOptions } from "./types";

/**
 * Regular expression pattern for extracting Google Meet URLs from text.
 * Matches URLs like: https://meet.google.com/abc-defg-hij
 */
const MEET_URL_REGEX = /https?:\/\/meet\.google\.com\/[a-z0-9-]+/i;

/**
 * Extract a Google Meet URL from a text field using regex.
 */
function extractMeetUrlFromText(
  text: string | null | undefined,
): string | null {
  if (!text?.trim()) {
    return null;
  }
  const match = text.match(MEET_URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Google Meet provider that extracts Meet URLs from calendar events
 * and creates online meetings via Google Calendar's conferenceData.
 * Implements the shared MeetingLinkProvider interface.
 */
export class GoogleMeetProvider implements MeetingLinkProvider {
  /**
   * Extract a Google Meet URL from a CalendarEvent.
   * Returns the meetingUrl if already present, otherwise null.
   *
   * Note: For raw Google Calendar API events, the extraction logic in
   * GoogleCalendarService already populates meetingUrl by checking
   * conferenceData, hangoutLink, location, and description (in that order).
   * This method handles the shared CalendarEvent type which may have
   * the URL already extracted or may need a fallback text search.
   */
  extractMeetingUrl(event: CalendarEvent): string | null {
    // The shared CalendarEvent type already has meetingUrl populated
    // by the calendar provider's mapping layer.
    if (event.meetingUrl) {
      return extractMeetUrlFromText(event.meetingUrl) ?? event.meetingUrl;
    }

    return null;
  }

  /**
   * Create an online meeting with a Google Meet link by creating a calendar event
   * with conferenceData attached. Delegates to GoogleCalendarService.createEvent
   * which automatically adds a Meet link for timed events.
   */
  async createOnlineMeeting(
    userId: string,
    options: MeetingOptions,
  ): Promise<ActionResult<MeetingLink>> {
    const result = await GoogleCalendarService.createEvent(userId, {
      title: options.subject,
      start: options.startDateTime,
      end: options.endDateTime,
    });

    if (result.isErr()) {
      return err(result.error);
    }

    const { meetingUrl } = result.value;

    return ok({
      joinUrl: meetingUrl ?? "",
      meetingId: result.value.eventId,
    });
  }
}
