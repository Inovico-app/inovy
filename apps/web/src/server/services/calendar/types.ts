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
}

export interface CreateEventInput {
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  calendarId?: string;
  attendees?: string[];
  addOnlineMeeting?: boolean;
  recurrence?: unknown;
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
