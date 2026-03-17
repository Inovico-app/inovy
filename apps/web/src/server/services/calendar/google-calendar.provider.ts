import type { calendar_v3 } from "googleapis";
import { err, ok } from "neverthrow";
import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import {
  GoogleCalendarService,
  type CalendarEvent as GoogleCalendarEvent,
} from "@/server/services/google-calendar.service";
import type { CalendarProvider } from "./calendar-provider";
import type {
  Calendar,
  CalendarEvent,
  CreateEventInput,
  GetUpcomingMeetingsOptions,
  UpdateEventInput,
} from "./types";

/**
 * Maps a Google Calendar service event to the shared CalendarEvent type.
 * The existing service type has `meetingUrl: string` (always present because
 * getUpcomingMeetings filters for it), while the shared type allows null.
 */
function mapGoogleEventToCalendarEvent(
  event: GoogleCalendarEvent,
): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    meetingUrl: event.meetingUrl || null,
    attendees: event.attendees,
    organizer: event.organizer,
    isOrganizer: event.isOrganizer,
    calendarId: event.calendarId,
  };
}

/**
 * Maps a raw Google Calendar API event (Schema$Event) to the shared CalendarEvent type.
 * Used for getEvent which returns the raw API response.
 */
function mapRawEventToCalendarEvent(
  event: calendar_v3.Schema$Event,
  calendarId: string,
): CalendarEvent {
  const startDate = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
      ? new Date(event.start.date)
      : new Date();

  const endDate = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : event.end?.date
      ? new Date(event.end.date)
      : new Date();

  // Extract meeting URL using the same priority order as the original service
  let meetingUrl: string | null = null;

  if (event.conferenceData?.entryPoints) {
    const meetEntry = event.conferenceData.entryPoints.find(
      (entry) =>
        entry.entryPointType === "video" &&
        entry.uri?.includes("meet.google.com"),
    );
    if (meetEntry?.uri) {
      meetingUrl = meetEntry.uri;
    }
  }

  if (!meetingUrl && event.hangoutLink?.includes("meet.google.com")) {
    meetingUrl = event.hangoutLink;
  }

  return {
    id: event.id || "",
    title: event.summary || "Untitled Event",
    start: startDate,
    end: endDate,
    meetingUrl,
    attendees: event.attendees?.map((a) => ({
      email: a.email || "",
      responseStatus: a.responseStatus || "needsAction",
    })),
    organizer: event.organizer
      ? { email: event.organizer.email || "" }
      : undefined,
    isOrganizer: event.organizer?.self ?? undefined,
    calendarId,
  };
}

/**
 * Google Calendar provider that delegates to the existing GoogleCalendarService.
 * Implements the shared CalendarProvider interface for provider-agnostic calendar access.
 */
export class GoogleCalendarProvider implements CalendarProvider {
  async listCalendars(userId: string): Promise<ActionResult<Calendar[]>> {
    const result = await GoogleCalendarService.getCalendarsList(userId);

    if (result.isErr()) {
      return err(result.error);
    }

    const calendars: Calendar[] = result.value.map((cal) => ({
      id: cal.id,
      name: cal.summary,
      accessRole: cal.accessRole,
    }));

    return ok(calendars);
  }

  async getUpcomingMeetings(
    userId: string,
    options: GetUpcomingMeetingsOptions,
  ): Promise<ActionResult<CalendarEvent[]>> {
    const result = await GoogleCalendarService.getUpcomingMeetings(userId, {
      timeMin: options.timeMin,
      timeMax: options.timeMax,
      calendarIds: options.calendarIds,
    });

    if (result.isErr()) {
      return err(result.error);
    }

    return ok(result.value.map(mapGoogleEventToCalendarEvent));
  }

  async createEvent(
    userId: string,
    event: CreateEventInput,
  ): Promise<
    ActionResult<{
      eventId: string;
      eventUrl: string;
      meetingUrl: string | null;
    }>
  > {
    return GoogleCalendarService.createEvent(userId, {
      title: event.title,
      start: event.startDateTime,
      end: event.endDateTime,
      description: event.description,
      location: event.location,
      calendarId: event.calendarId,
      attendees: event.attendees,
      allDay: false,
      userTimezone: event.timeZone,
      recurrence: event.recurrence as string[] | undefined,
    });
  }

  async updateEvent(
    userId: string,
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<ActionResult<{ eventUrl: string; meetingUrl: string | null }>> {
    return GoogleCalendarService.updateEvent(userId, eventId, {
      title: updates.title,
      start: updates.startDateTime,
      end: updates.endDateTime,
      addMeetLinkIfMissing: updates.addOnlineMeeting,
    });
  }

  async getEvent(
    userId: string,
    calendarId: string,
    eventId: string,
  ): Promise<ActionResult<CalendarEvent>> {
    // The existing service always uses "primary" as calendarId,
    // but we accept it as a parameter for interface conformance.
    const result = await GoogleCalendarService.getEvent(userId, eventId);

    if (result.isErr()) {
      return err(result.error);
    }

    // The existing getEvent returns ActionResult<unknown>, so we cast
    // the raw Google Calendar API response to extract event fields.
    const rawEvent = result.value as calendar_v3.Schema$Event;

    if (!rawEvent || !rawEvent.id) {
      return err(
        ActionErrors.notFound(
          "Calendar event not found or missing ID",
          "GoogleCalendarProvider.getEvent",
        ),
      );
    }

    return ok(mapRawEventToCalendarEvent(rawEvent, calendarId));
  }
}
