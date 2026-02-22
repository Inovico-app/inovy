import { google, type calendar_v3 } from "googleapis";
import { err, ok } from "neverthrow";
import { createGoogleOAuthClient } from "../../features/integrations/google/lib/google-oauth";
import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { AutoActionsQueries } from "../data-access/auto-actions.queries";
import type { Task } from "../db/schema/tasks";
import { GoogleOAuthService } from "./google-oauth.service";

/**
 * Regular expression pattern for extracting Google Meet URLs from text
 * Matches URLs like: https://meet.google.com/abc-defg-hij
 */
const MEET_URL_REGEX = /https?:\/\/meet\.google\.com\/[a-z0-9-]+/i;

/**
 * Extract Google Meet URL from a text field using regex pattern
 * @param text - The text to search for Google Meet URL
 * @returns The extracted URL or null if not found
 */
function extractMeetUrlFromText(text: string | null | undefined): string | null {
  if (!text?.trim()) {
    return null;
  }
  const match = text.match(MEET_URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Extract Google Meet URL from a calendar event
 * Tries multiple sources in priority order: conferenceData, hangoutLink, location, description
 * @param event - The Google Calendar event
 * @returns The extracted Google Meet URL or null if not found
 */
function extractMeetingUrl(event: calendar_v3.Schema$Event): string | null {
  // 1. Check conferenceData (modern Google Calendar format)
  if (event.conferenceData?.entryPoints && Array.isArray(event.conferenceData.entryPoints)) {
    const meetEntry = event.conferenceData.entryPoints.find(
      (entry) =>
        entry.entryPointType === "video" &&
        entry.uri?.includes("meet.google.com")
    );
    if (meetEntry?.uri) {
      return meetEntry.uri;
    }
  }

  // 2. Check hangoutLink (legacy Google Calendar format)
  if (event.hangoutLink?.includes("meet.google.com")) {
    return event.hangoutLink;
  }

  // 3. Check location field (common in external calendar apps)
  const locationUrl = extractMeetUrlFromText(event.location);
  if (locationUrl) {
    return locationUrl;
  }

  // 4. Check description field (fallback for manually entered URLs)
  return extractMeetUrlFromText(event.description);
}

/**
 * Calendar event with Google Meet link
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /**
   * Google Meet URL extracted from one of the following sources (in priority order):
   * 1. conferenceData.entryPoints (modern Google Calendar format)
   * 2. hangoutLink (legacy Google Calendar format)
   * 3. location field (common in external calendar apps)
   * 4. description field (fallback for manually entered URLs)
   */
  meetingUrl: string;
  attendees?: Array<{ email: string; responseStatus: string }>;
  organizer?: { email: string };
  calendarId: string;
}

/**
 * Google Calendar Service
 * Manages calendar event creation from tasks
 */
export class GoogleCalendarService {
  /**
   * Create a calendar event from a task
   */
  static async createEventFromTask(
    userId: string,
    organizationId: string,
    task: Task,
    options?: {
      duration?: number; // in minutes, default 30
      description?: string;
      userTimezone?: string;
    }
  ): Promise<ActionResult<{ eventId: string; eventUrl: string }>> {
    try {
      // Verify task belongs to organization
      try {
        assertOrganizationAccess(
          task.organizationId,
          organizationId,
          "GoogleCalendarService.createEventFromTask"
        );
      } catch (error) {
        return err(
          ActionErrors.notFound(
            "Task not found",
            "GoogleCalendarService.createEventFromTask"
          )
        );
      }

      // Get valid access token
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleCalendarService.createEventFromTask"
          )
        );
      }

      const accessToken = tokenResult.value;

      // Create OAuth client with token
      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Initialize Calendar API
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Prepare event details
      const duration = options?.duration || 30; // Default 30 minutes
      const startDate = task.dueDate || new Date();
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      // Build event description
      let eventDescription = options?.description || task.description || "";
      eventDescription += `\n\n`;
      eventDescription += `Task Priority: ${task.priority}\n`;
      eventDescription += `Task Status: ${task.status}\n`;
      if (task.assigneeName) {
        eventDescription += `Assigned to: ${task.assigneeName}\n`;
      }
      eventDescription += `\nCreated from Inovy recording\n`;
      eventDescription += `Task ID: ${task.id}`;

      // Use user's timezone or fallback to UTC
      const timeZone = options?.userTimezone || "UTC";

      // Create event
      const event = {
        summary: task.title,
        description: eventDescription,
        start: {
          dateTime: startDate.toISOString(),
          timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone,
        },
        colorId:
          task.priority === "urgent"
            ? "11"
            : task.priority === "high"
              ? "9"
              : undefined, // Red for urgent, blue for high
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      if (!response.data.id || !response.data.htmlLink) {
        return err(
          ActionErrors.internal(
            "Failed to create calendar event - no event ID returned",
            undefined,
            "GoogleCalendarService.createEventFromTask"
          )
        );
      }

      logger.info("Created Google Calendar event from task", {
        userId,
        taskId: task.id,
        eventId: response.data.id,
      });

      // Record the action in auto_actions table via DAL
      await AutoActionsQueries.createAutoAction({
        userId,
        type: "calendar_event",
        provider: "google",
        taskId: task.id,
        recordingId: task.recordingId,
        status: "completed",
        externalId: response.data.id,
        externalUrl: response.data.htmlLink,
        processedAt: new Date(),
      });

      return ok({
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
      });
    } catch (error) {
      const errorMessage = `Failed to create Google Calendar event: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId, taskId: task.id }, error as Error);

      // Record failed action
      try {
        await AutoActionsQueries.createAutoAction({
          userId,
          type: "calendar_event",
          provider: "google",
          taskId: task.id,
          recordingId: task.recordingId,
          status: "failed",
          errorMessage: errorMessage,
          processedAt: new Date(),
        });
      } catch (dbError) {
        logger.error("Failed to record failed action", {}, dbError as Error);
      }

      return err(
        ActionErrors.internal(
          errorMessage,
          error as Error,
          "GoogleCalendarService.createEventFromTask"
        )
      );
    }
  }

  /**
   * Create multiple calendar events from tasks
   */
  static async createEventsFromTasks(
    userId: string,
    organizationId: string,
    tasks: Task[],
    options?: {
      duration?: number;
    }
  ): Promise<
    ActionResult<{
      successful: Array<{
        taskId: string;
        eventId: string;
        eventUrl: string;
      }>;
      failed: Array<{ taskId: string; error: string }>;
    }>
  > {
    try {
      // Verify all tasks belong to organization
      for (const task of tasks) {
        try {
          assertOrganizationAccess(
            task.organizationId,
            organizationId,
            "GoogleCalendarService.createEventsFromTasks"
          );
        } catch (error) {
          return err(
            ActionErrors.notFound(
              "One or more tasks not found",
              "GoogleCalendarService.createEventsFromTasks"
            )
          );
        }
      }

      const results = {
        successful: [] as Array<{
          taskId: string;
          eventId: string;
          eventUrl: string;
        }>,
        failed: [] as Array<{ taskId: string; error: string }>,
      };

      for (const task of tasks) {
        const result = await this.createEventFromTask(
          userId,
          organizationId,
          task,
          options
        );

        if (result.isOk()) {
          results.successful.push({
            taskId: task.id,
            eventId: result.value.eventId,
            eventUrl: result.value.eventUrl,
          });
        } else {
          results.failed.push({
            taskId: task.id,
            error: result.error.message,
          });
        }
      }

      logger.info("Bulk calendar event creation completed", {
        userId,
        total: tasks.length,
        successful: results.successful.length,
        failed: results.failed.length,
      });

      return ok(results);
    } catch (error) {
      logger.error(
        "Failed to create calendar events",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to create calendar events",
          error as Error,
          "GoogleCalendarService.createEventsFromTasks"
        )
      );
    }
  }

  /**
   * Get calendar event details
   */
  static async getEvent(
    userId: string,
    eventId: string
  ): Promise<ActionResult<unknown>> {
    try {
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleCalendarService.getEvent"
          )
        );
      }

      const accessToken = tokenResult.value;

      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const response = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });

      return ok(response.data);
    } catch (error) {
      logger.error(
        "Failed to get calendar event",
        { userId, eventId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get calendar event",
          error as Error,
          "GoogleCalendarService.getEvent"
        )
      );
    }
  }

  /**
   * Update a calendar event
   * @param userId - User ID
   * @param eventId - Calendar event ID
   * @param updates - Fields to update (title, start, end; optionally add Meet link if missing)
   * @returns Result containing event URL and meeting URL
   */
  static async updateEvent(
    userId: string,
    eventId: string,
    updates: {
      title?: string;
      start?: Date;
      end?: Date;
      addMeetLinkIfMissing?: boolean;
      calendarId?: string;
      userTimezone?: string;
    }
  ): Promise<
    ActionResult<{
      eventUrl: string;
      meetingUrl: string | null;
    }>
  > {
    try {
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleCalendarService.updateEvent"
          )
        );
      }

      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: tokenResult.value,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const calendarId = updates.calendarId || "primary";
      const timeZone =
        updates.userTimezone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Fetch existing event to check for Meet link and build patch
      let existing: calendar_v3.Schema$Event | null | undefined;
      try {
        const existingResult = await calendar.events.get({
          calendarId,
          eventId,
        });
        existing = existingResult.data;
      } catch (getError) {
        const status = (getError as { response?: { status?: number } })
          ?.response?.status;
        if (status === 404) {
          return err(
            ActionErrors.notFound(
              "Calendar event not found",
              "GoogleCalendarService.updateEvent"
            )
          );
        }
        throw getError;
      }

      if (!existing) {
        return err(
          ActionErrors.notFound(
            "Calendar event not found",
            "GoogleCalendarService.updateEvent"
          )
        );
      }

      const hasMeetLink =
        existing.hangoutLink?.includes("meet.google.com") ||
        existing.conferenceData?.entryPoints?.some(
          (ep) =>
            ep.entryPointType === "video" && ep.uri?.includes("meet.google.com")
        );

      type PatchPayload = {
        summary?: string;
        start?: { dateTime?: string; date?: string; timeZone?: string };
        end?: { dateTime?: string; date?: string; timeZone?: string };
        conferenceData?: {
          createRequest: {
            requestId: string;
            conferenceSolutionKey: { type: string };
          };
        };
      };

      const patchBody: PatchPayload = {};

      if (updates.title !== undefined) {
        patchBody.summary = updates.title;
      }

      if (updates.start !== undefined) {
        const isAllDay = "date" in (existing.start || {});
        if (isAllDay) {
          patchBody.start = {
            date: updates.start.toISOString().split("T")[0],
          };
        } else {
          patchBody.start = {
            dateTime: updates.start.toISOString(),
            timeZone,
          };
        }
      }

      if (updates.end !== undefined) {
        const isAllDay = "date" in (existing.end || {});
        if (isAllDay) {
          patchBody.end = {
            date: updates.end.toISOString().split("T")[0],
          };
        } else {
          patchBody.end = {
            dateTime: updates.end.toISOString(),
            timeZone,
          };
        }
      }

      if (
        updates.addMeetLinkIfMissing &&
        !hasMeetLink &&
        !("date" in (existing.start || {}))
      ) {
        patchBody.conferenceData = {
          createRequest: {
            requestId: `${Date.now()}-${Math.random()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      if (Object.keys(patchBody).length === 0) {
        return ok({
          eventUrl: existing.htmlLink || "",
          meetingUrl: hasMeetLink ? existing.hangoutLink || null : null,
        });
      }

      const patchParams: {
        calendarId: string;
        eventId: string;
        requestBody: PatchPayload;
        conferenceDataVersion?: number;
      } = {
        calendarId,
        eventId,
        requestBody: patchBody,
      };

      if (patchBody.conferenceData) {
        patchParams.conferenceDataVersion = 1;
      }

      const response = await calendar.events.patch(patchParams);

      let meetingUrl: string | null = null;
      if (
        response.data.conferenceData?.entryPoints &&
        Array.isArray(response.data.conferenceData.entryPoints)
      ) {
        const meetEntry = response.data.conferenceData.entryPoints.find(
          (ep) =>
            ep.entryPointType === "video" && ep.uri?.includes("meet.google.com")
        );
        if (meetEntry?.uri) meetingUrl = meetEntry.uri;
      }
      if (
        !meetingUrl &&
        response.data.hangoutLink?.includes("meet.google.com")
      ) {
        meetingUrl = response.data.hangoutLink;
      }

      logger.info("Updated Google Calendar event", {
        userId,
        eventId,
        calendarId,
      });

      return ok({
        eventUrl: response.data.htmlLink || "",
        meetingUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to update calendar event", { userId, eventId }, error as Error);
      return err(
        ActionErrors.internal(
          `Failed to update calendar event: ${message}`,
          error as Error,
          "GoogleCalendarService.updateEvent"
        )
      );
    }
  }

  /**
   * Create a calendar event
   * @param userId - User ID
   * @param eventDetails - Event details
   * @returns Result containing event ID and URL
   */
  static async createEvent(
    userId: string,
    eventDetails: {
      title: string;
      start: Date;
      end: Date;
      description?: string;
      location?: string;
      calendarId?: string; // Defaults to "primary"
      attendees?: string[]; // Array of email addresses
      allDay?: boolean;
      userTimezone?: string;
    }
  ): Promise<
    ActionResult<{
      eventId: string;
      eventUrl: string;
      meetingUrl: string | null;
    }>
  > {
    try {
      // Get valid access token
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleCalendarService.createEvent"
          )
        );
      }

      const accessToken = tokenResult.value;

      // Create OAuth client with token
      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Initialize Calendar API
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const calendarId = eventDetails.calendarId || "primary";

      // Prepare attendees array
      const attendees = eventDetails.attendees && eventDetails.attendees.length > 0
        ? eventDetails.attendees.map((email) => ({ email }))
        : undefined;

      // Use user's timezone or fallback to server timezone
      const timeZone = eventDetails.userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Create event with Google Meet conference data
      type EventPayload = {
        summary: string;
        description: string;
        location?: string;
        attendees?: Array<{ email: string }>;
        start: { dateTime?: string; date?: string; timeZone?: string };
        end: { dateTime?: string; date?: string; timeZone?: string };
        conferenceData?: {
          createRequest: {
            requestId: string;
            conferenceSolutionKey: { type: string };
          };
        };
      };

      let event: EventPayload;

      if (eventDetails.allDay) {
        // All-day events use date-only format (YYYY-MM-DD)
        const startDate = eventDetails.start.toISOString().split("T")[0];
        const endDate = eventDetails.end.toISOString().split("T")[0];
        event = {
          summary: eventDetails.title,
          description: eventDetails.description || "",
          location: eventDetails.location || undefined,
          attendees,
          start: { date: startDate },
          end: { date: endDate },
        };
      } else {
        // Timed events use dateTime with timezone
        event = {
          summary: eventDetails.title,
          description: eventDetails.description || "",
          location: eventDetails.location || undefined,
          attendees,
          start: {
            dateTime: eventDetails.start.toISOString(),
            timeZone,
          },
          end: {
            dateTime: eventDetails.end.toISOString(),
            timeZone,
          },
          // Only add conference data for timed events (all-day events don't support Meet links)
          conferenceData: {
            createRequest: {
              requestId: `${Date.now()}-${Math.random()}`,
              conferenceSolutionKey: {
                type: "hangoutsMeet",
              },
            },
          },
        };
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: 1,
      });

      if (!response.data.id || !response.data.htmlLink) {
        return err(
          ActionErrors.internal(
            "Failed to create calendar event - no event ID returned",
            undefined,
            "GoogleCalendarService.createEvent"
          )
        );
      }

      // Extract Google Meet URL
      let meetingUrl: string | null = null;
      if (
        response.data.conferenceData?.entryPoints &&
        Array.isArray(response.data.conferenceData.entryPoints)
      ) {
        const meetEntry = response.data.conferenceData.entryPoints.find(
          (entry) =>
            entry.entryPointType === "video" &&
            entry.uri?.includes("meet.google.com")
        );
        if (meetEntry?.uri) {
          meetingUrl = meetEntry.uri;
        }
      }

      // Fallback to hangoutLink (legacy format)
      if (
        !meetingUrl &&
        response.data.hangoutLink?.includes("meet.google.com")
      ) {
        meetingUrl = response.data.hangoutLink;
      }

      logger.info("Created Google Calendar event", {
        userId,
        eventId: response.data.id,
        calendarId,
      });

      return ok({
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
        meetingUrl,
      });
    } catch (error) {
      const errorMessage = `Failed to create Google Calendar event: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId }, error as Error);

      return err(
        ActionErrors.internal(
          errorMessage,
          error as Error,
          "GoogleCalendarService.createEvent"
        )
      );
    }
  }

  /**
   * Get list of user's calendars
   * @param userId - User ID
   * @returns Result containing list of calendars
   */
  static async getCalendarsList(
    userId: string
  ): Promise<
    ActionResult<Array<{ id: string; summary: string; accessRole: string }>>
  > {
    try {
      // Get valid access token
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleCalendarService.getCalendarsList"
          )
        );
      }

      const accessToken = tokenResult.value;

      // Create OAuth client with token
      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Initialize Calendar API
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      const response = await calendar.calendarList.list({
        minAccessRole: "writer", // Only return calendars user can write to
      });

      if (!response.data.items) {
        return ok([]);
      }

      const calendars = response.data.items
        .filter((cal) => cal.id) // Only require id, summary can be empty
        .map((cal) => ({
          id: cal.id!,
          summary: cal.summary || cal.id || "Unnamed Calendar",
          accessRole: cal.accessRole || "reader",
        }));

      logger.info("Fetched user calendars", {
        userId,
        count: calendars.length,
      });

      return ok(calendars);
    } catch (error) {
      // Check for insufficient scopes error
      const isInsufficientScopes =
        error instanceof Error &&
        (error.message.includes("insufficient authentication scopes") ||
          error.message.includes("insufficientPermissions") ||
          (error as any).code === 403);

      if (isInsufficientScopes) {
        logger.error("Insufficient Google OAuth scopes for calendar list", {
          userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return err(
          ActionErrors.badRequest(
            "Your Google account connection is missing required permissions. Please disconnect and reconnect your Google account in settings to grant calendar access.",
            "GoogleCalendarService.getCalendarsList"
          )
        );
      }

      logger.error("Failed to get calendars list", { userId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get calendars list",
          error as Error,
          "GoogleCalendarService.getCalendarsList"
        )
      );
    }
  }

  /**
   * Get upcoming Google Meet meetings for a user
   * @param userId - User ID
   * @param options - Options for filtering meetings
   * @returns Result containing list of calendar events with Google Meet links
   */
  static async getUpcomingMeetings(
    userId: string,
    options?: {
      timeMin?: Date; // Default: now
      timeMax?: Date; // Default: now + 30 minutes
      calendarIds?: string[]; // Default: ['primary']
    }
  ): Promise<ActionResult<CalendarEvent[]>> {
    try {
      const tokenResult = await GoogleOAuthService.getValidAccessToken(userId);

      if (tokenResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get valid access token",
            tokenResult.error,
            "GoogleCalendarService.getUpcomingMeetings"
          )
        );
      }

      const accessToken = tokenResult.value;

      const oauth2Client = createGoogleOAuthClient();
      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Set default time range (now to 30 minutes from now)
      const now = new Date();
      const timeMin = options?.timeMin ?? now;
      const timeMax =
        options?.timeMax ?? new Date(now.getTime() + 30 * 60 * 1000);
      const calendarIds = options?.calendarIds ?? ["primary"];

      const meetings: CalendarEvent[] = [];

      // Fetch events from each calendar
      for (const calendarId of calendarIds) {
        try {
          const response = await calendar.events.list({
            calendarId,
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true, // Expand recurring events
            orderBy: "startTime",
            maxResults: 100,
          });

          if (!response.data.items) {
            continue;
          }

          // Get user's email from OAuth connection for attendance filtering
          const connectionResult =
            await GoogleOAuthService.getConnection(userId);
          const userEmail =
            connectionResult.isOk() && connectionResult.value?.email
              ? connectionResult.value.email.toLowerCase()
              : null;

          for (const event of response.data.items) {
            // Extract Google Meet URL from various sources
            const meetingUrl = extractMeetingUrl(event);

            // Skip if no Google Meet link found
            if (!meetingUrl) {
              continue;
            }

            // Filter by user attendance
            // User must be organizer or have accepted the invitation
            const isOrganizer =
              event.organizer?.email?.toLowerCase() === userEmail;
            const isAttending =
              event.attendees?.some(
                (attendee) =>
                  attendee.email?.toLowerCase() === userEmail &&
                  (attendee.responseStatus === "accepted" ||
                    attendee.responseStatus === "tentative")
              ) ?? false;

            if (!isOrganizer && !isAttending) {
              continue;
            }

            // Extract event details
            const startDate = event.start?.dateTime
              ? new Date(event.start.dateTime)
              : event.start?.date
                ? new Date(event.start.date)
                : null;
            const endDate = event.end?.dateTime
              ? new Date(event.end.dateTime)
              : event.end?.date
                ? new Date(event.end.date)
                : null;

            if (!startDate || !endDate || !event.id) {
              continue;
            }

            meetings.push({
              id: event.id,
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
              calendarId,
            });
          }
        } catch (calendarError) {
          logger.error(
            "Failed to fetch events from calendar",
            {
              userId,
              calendarId,
              error: calendarError,
            },
            calendarError as Error
          );
          // Continue with other calendars
        }
      }

      logger.info("Fetched upcoming Google Meet meetings", {
        userId,
        count: meetings.length,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      });

      return ok(meetings);
    } catch (error) {
      logger.error(
        "Failed to get upcoming meetings",
        { userId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to get upcoming meetings",
          error as Error,
          "GoogleCalendarService.getUpcomingMeetings"
        )
      );
    }
  }
}

