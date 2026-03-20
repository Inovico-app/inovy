import { err, ok } from "neverthrow";
import type { ActionResult } from "@/lib/server-action-client/action-errors";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { logger } from "@/lib/logger";
import { MicrosoftOAuthService } from "@/server/services/microsoft-oauth.service";
import type { CalendarProvider } from "./calendar-provider";
import { extractTeamsUrl, graphRequest } from "./graph-client";
import type {
  Calendar,
  CalendarEvent,
  CreateEventInput,
  GetSeriesInstancesOptions,
  GetUpcomingMeetingsOptions,
  UpdateEventInput,
} from "./types";

/**
 * Microsoft Graph API response types (internal, not exported).
 */
interface GraphCalendar {
  id: string;
  name: string;
  canEdit: boolean;
}

interface GraphDateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

interface GraphEmailAddress {
  address: string;
  name?: string;
}

interface GraphAttendee {
  emailAddress: GraphEmailAddress;
  type: string;
  status?: { response: string };
}

interface GraphEvent {
  id: string;
  subject: string;
  start: GraphDateTimeTimeZone;
  end: GraphDateTimeTimeZone;
  onlineMeeting?: { joinUrl?: string } | null;
  location?: { displayName?: string } | null;
  bodyPreview?: string;
  attendees?: GraphAttendee[];
  organizer?: { emailAddress: GraphEmailAddress };
  isOrganizer?: boolean;
  webLink?: string;
  seriesMasterId?: string;
}

/**
 * Map a Microsoft Graph event to the shared CalendarEvent type.
 */
function mapGraphEventToCalendarEvent(
  event: GraphEvent,
  calendarId: string,
): CalendarEvent {
  return {
    id: event.id,
    title: event.subject || "Untitled Event",
    start: new Date(event.start.dateTime + "Z"),
    end: new Date(event.end.dateTime + "Z"),
    meetingUrl: event.onlineMeeting?.joinUrl ?? extractTeamsUrl(event) ?? null,
    attendees: event.attendees?.map((a) => ({
      email: a.emailAddress.address,
      responseStatus: a.status?.response ?? "none",
    })),
    organizer: event.organizer
      ? { email: event.organizer.emailAddress.address }
      : undefined,
    isOrganizer: event.isOrganizer,
    calendarId,
    recurringSeriesId: event.seriesMasterId ?? undefined,
  };
}

/**
 * Microsoft Calendar provider using the Microsoft Graph REST API v1.0.
 * Implements the shared CalendarProvider interface for provider-agnostic calendar access.
 */
export class MicrosoftCalendarProvider implements CalendarProvider {
  async listCalendars(userId: string): Promise<ActionResult<Calendar[]>> {
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const result = await graphRequest<{ value: GraphCalendar[] }>(
        tokenResult.value,
        "GET",
        "/me/calendars?$select=id,name,canEdit",
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const calendars: Calendar[] = result.value.value.map((item) => ({
        id: item.id,
        name: item.name,
        accessRole: item.canEdit ? "writer" : "reader",
      }));

      return ok(calendars);
    } catch (error) {
      logger.error(
        "Failed to list Microsoft calendars",
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to list Microsoft calendars",
          error as Error,
          "MicrosoftCalendarProvider.listCalendars",
        ),
      );
    }
  }

  async getUpcomingMeetings(
    userId: string,
    options: GetUpcomingMeetingsOptions,
  ): Promise<ActionResult<CalendarEvent[]>> {
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const startDateTime = options.timeMin.toISOString();
      const endDateTime = options.timeMax.toISOString();
      const selectFields =
        "id,subject,start,end,onlineMeeting,location,bodyPreview,attendees,organizer,isOrganizer,seriesMasterId";
      const queryParams = `startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=${selectFields}&$orderby=start/dateTime`;

      const calendarIds = options.calendarIds;

      if (calendarIds && calendarIds.length > 0) {
        // Fetch events for all calendars in parallel
        const results = await Promise.all(
          calendarIds.map((calendarId) =>
            graphRequest<{ value: GraphEvent[] }>(
              tokenResult.value,
              "GET",
              `/me/calendars/${calendarId}/calendarView?${queryParams}`,
            ),
          ),
        );

        const allEvents: CalendarEvent[] = [];

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const calendarId = calendarIds[i];

          if (result.isErr()) {
            logger.warn(
              "Failed to fetch events for Microsoft calendar",
              { userId, calendarId },
              result.error.cause as Error | undefined,
            );
            continue;
          }

          const events = result.value.value.map((event) =>
            mapGraphEventToCalendarEvent(event, calendarId),
          );
          allEvents.push(...events);
        }

        // Sort combined results by start time
        allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

        return ok(allEvents);
      }

      // Fetch from default calendar view
      const result = await graphRequest<{ value: GraphEvent[] }>(
        tokenResult.value,
        "GET",
        `/me/calendarView?${queryParams}`,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const events = result.value.value.map((event) =>
        mapGraphEventToCalendarEvent(event, "primary"),
      );

      return ok(events);
    } catch (error) {
      logger.error(
        "Failed to get upcoming Microsoft meetings",
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to get upcoming Microsoft meetings",
          error as Error,
          "MicrosoftCalendarProvider.getUpcomingMeetings",
        ),
      );
    }
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
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const timeZone = event.timeZone || "UTC";

      const requestBody: Record<string, unknown> = {
        subject: event.title,
        start: {
          dateTime: event.startDateTime.toISOString(),
          timeZone,
        },
        end: {
          dateTime: event.endDateTime.toISOString(),
          timeZone,
        },
      };

      if (event.description) {
        requestBody.body = {
          contentType: "text",
          content: event.description,
        };
      }

      if (event.location) {
        requestBody.location = { displayName: event.location };
      }

      if (event.attendees && event.attendees.length > 0) {
        requestBody.attendees = event.attendees.map((email) => ({
          emailAddress: { address: email },
          type: "required",
        }));
      }

      if (event.addOnlineMeeting) {
        requestBody.isOnlineMeeting = true;
        requestBody.onlineMeetingProvider = "teamsForBusiness";
      }

      const path =
        event.calendarId && event.calendarId !== "primary"
          ? `/me/calendars/${event.calendarId}/events`
          : "/me/events";

      const result = await graphRequest<GraphEvent & { webLink: string }>(
        tokenResult.value,
        "POST",
        path,
        requestBody,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const created = result.value;

      return ok({
        eventId: created.id,
        eventUrl: created.webLink || "",
        meetingUrl:
          created.onlineMeeting?.joinUrl ?? extractTeamsUrl(created) ?? null,
      });
    } catch (error) {
      logger.error(
        "Failed to create Microsoft calendar event",
        { userId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to create Microsoft calendar event",
          error as Error,
          "MicrosoftCalendarProvider.createEvent",
        ),
      );
    }
  }

  async updateEvent(
    userId: string,
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<ActionResult<{ eventUrl: string; meetingUrl: string | null }>> {
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const requestBody: Record<string, unknown> = {};

      if (updates.title !== undefined) {
        requestBody.subject = updates.title;
      }

      if (updates.description !== undefined) {
        requestBody.body = {
          contentType: "text",
          content: updates.description,
        };
      }

      if (updates.startDateTime !== undefined) {
        requestBody.start = {
          dateTime: updates.startDateTime.toISOString(),
          timeZone: "UTC",
        };
      }

      if (updates.endDateTime !== undefined) {
        requestBody.end = {
          dateTime: updates.endDateTime.toISOString(),
          timeZone: "UTC",
        };
      }

      if (updates.location !== undefined) {
        requestBody.location = { displayName: updates.location };
      }

      if (updates.addOnlineMeeting) {
        requestBody.isOnlineMeeting = true;
        requestBody.onlineMeetingProvider = "teamsForBusiness";
      }

      const result = await graphRequest<GraphEvent & { webLink: string }>(
        tokenResult.value,
        "PATCH",
        `/me/events/${eventId}`,
        requestBody,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const updated = result.value;

      return ok({
        eventUrl: updated.webLink || "",
        meetingUrl:
          updated.onlineMeeting?.joinUrl ?? extractTeamsUrl(updated) ?? null,
      });
    } catch (error) {
      logger.error(
        "Failed to update Microsoft calendar event",
        { userId, eventId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to update Microsoft calendar event",
          error as Error,
          "MicrosoftCalendarProvider.updateEvent",
        ),
      );
    }
  }

  async getEvent(
    userId: string,
    calendarId: string,
    eventId: string,
  ): Promise<ActionResult<CalendarEvent>> {
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const selectFields =
        "id,subject,start,end,onlineMeeting,location,bodyPreview,attendees,organizer,isOrganizer,seriesMasterId";

      const result = await graphRequest<GraphEvent>(
        tokenResult.value,
        "GET",
        `/me/events/${eventId}?$select=${selectFields}`,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      return ok(mapGraphEventToCalendarEvent(result.value, calendarId));
    } catch (error) {
      logger.error(
        "Failed to get Microsoft calendar event",
        { userId, eventId },
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to get Microsoft calendar event",
          error as Error,
          "MicrosoftCalendarProvider.getEvent",
        ),
      );
    }
  }

  async getSeriesInstances(
    userId: string,
    seriesId: string,
    options: GetSeriesInstancesOptions,
  ): Promise<ActionResult<CalendarEvent[]>> {
    try {
      const tokenResult =
        await MicrosoftOAuthService.getValidAccessToken(userId);
      if (tokenResult.isErr()) {
        return err(tokenResult.error);
      }

      const startDateTime = options.timeMin.toISOString();
      const endDateTime = options.timeMax.toISOString();
      const selectFields =
        "id,subject,start,end,onlineMeeting,location,bodyPreview,attendees,organizer,isOrganizer,seriesMasterId";
      const calendarPath = options.calendarId
        ? `/me/calendars/${options.calendarId}/events/${seriesId}/instances`
        : `/me/events/${seriesId}/instances`;

      const result = await graphRequest<{ value: GraphEvent[] }>(
        tokenResult.value,
        "GET",
        `${calendarPath}?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=${selectFields}`,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      const resolvedCalendarId = options.calendarId || "primary";
      const events: CalendarEvent[] = result.value.value.map((graphEvent) =>
        mapGraphEventToCalendarEvent(graphEvent, resolvedCalendarId),
      );

      return ok(events);
    } catch (error) {
      logger.error("Failed to get series instances from Microsoft", {
        component: "MicrosoftCalendarProvider.getSeriesInstances",
        userId,
        seriesId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get series instances",
          error as Error,
          "MicrosoftCalendarProvider.getSeriesInstances",
        ),
      );
    }
  }
}
