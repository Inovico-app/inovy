import { google } from "googleapis";
import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { assertOrganizationAccess } from "../../lib/organization-isolation";
import { createGoogleOAuthClient } from "../../lib/google-oauth";
import { logger } from "../../lib/logger";
import { AutoActionsQueries } from "../data-access";
import type { Task } from "../db/schema";
import { GoogleOAuthService } from "./google-oauth.service";

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

      // Create event
      const event = {
        summary: task.title,
        description: eventDescription,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "UTC",
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
        const result = await this.createEventFromTask(userId, organizationId, task, options);

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
}

