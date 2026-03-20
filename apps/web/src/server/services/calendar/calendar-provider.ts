import type { ActionResult } from "@/lib/server-action-client/action-errors";
import type {
  Calendar,
  CalendarEvent,
  CreateEventInput,
  GetSeriesInstancesOptions,
  GetUpcomingMeetingsOptions,
  UpdateEventInput,
} from "./types";

export interface CalendarProvider {
  listCalendars(userId: string): Promise<ActionResult<Calendar[]>>;
  getUpcomingMeetings(
    userId: string,
    options: GetUpcomingMeetingsOptions,
  ): Promise<ActionResult<CalendarEvent[]>>;
  createEvent(
    userId: string,
    event: CreateEventInput,
  ): Promise<
    ActionResult<{
      eventId: string;
      eventUrl: string;
      meetingUrl: string | null;
    }>
  >;
  updateEvent(
    userId: string,
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<ActionResult<{ eventUrl: string; meetingUrl: string | null }>>;
  getEvent(
    userId: string,
    calendarId: string,
    eventId: string,
  ): Promise<ActionResult<CalendarEvent>>;
  getSeriesInstances(
    userId: string,
    seriesId: string,
    options: GetSeriesInstancesOptions,
  ): Promise<ActionResult<CalendarEvent[]>>;
}
