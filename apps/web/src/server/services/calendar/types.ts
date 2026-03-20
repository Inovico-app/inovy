export interface Calendar {
  id: string;
  name: string;
  accessRole?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  meetingUrl: string | null;
  attendees?: Array<{ email: string; responseStatus: string }>;
  organizer?: { email: string };
  isOrganizer?: boolean;
  calendarId: string;
  recurringSeriesId?: string; // Google: recurringEventId, Microsoft: seriesMasterId
}

export interface GetSeriesInstancesOptions {
  timeMin: Date;
  timeMax: Date;
  calendarId: string;
}

/**
 * RRULE strings array for calendar event recurrence (RFC 5545 format).
 * Example: ["RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"]
 *
 * Use {@link generateRRule} from `@/features/meetings/lib/recurrence`
 * to build these from a user-facing RecurrencePattern.
 */
export type RecurrenceRule = string[];

export interface CreateEventInput {
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  calendarId?: string;
  attendees?: string[];
  addOnlineMeeting?: boolean;
  recurrence?: RecurrenceRule;
  timeZone?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  location?: string;
  addOnlineMeeting?: boolean;
}

export interface MeetingOptions {
  subject: string;
  startDateTime: Date;
  endDateTime: Date;
}

export interface MeetingLink {
  joinUrl: string;
  meetingId?: string;
}

export interface GetUpcomingMeetingsOptions {
  timeMin: Date;
  timeMax: Date;
  calendarIds?: string[];
}
