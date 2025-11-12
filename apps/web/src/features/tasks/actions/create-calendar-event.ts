"use server";

import { z } from "zod";
import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { logger } from "@/lib/logger";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const createCalendarEventSchema = z.object({
  taskId: z.string().uuid(),
  duration: z.number().min(15).max(480).optional(), // 15 min to 8 hours
});

/**
 * Server action to create a Google Calendar event from a task
 */
export const createCalendarEvent = authorizedActionClient
  .metadata({ policy: "tasks:update" })
  .schema(createCalendarEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user has Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest(
        "Google account not connected. Please connect in settings first."
      );
    }

    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, parsedInput.taskId))
      .limit(1);

    if (!task) {
      throw ActionErrors.notFound("Task", "create-calendar-event");
    }

    // Verify task belongs to user's organization using centralized helper
    try {
      assertOrganizationAccess(
        task.organizationId,
        organizationId,
        "createCalendarEvent"
      );
    } catch (error) {
      throw ActionErrors.notFound("Task", "create-calendar-event");
    }

    logger.info("Creating Google Calendar event from task", {
      userId: user.id,
      taskId: task.id,
    });

    // Create calendar event
    const result = await GoogleCalendarService.createEventFromTask(
      user.id,
      organizationId,
      task,
      {
        duration: parsedInput.duration,
      }
    );

    if (result.isErr()) {
      logger.error("Failed to create calendar event", {
        userId: user.id,
        taskId: task.id,
        error: result.error.message,
      });

      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "create-calendar-event"
      );
    }

    logger.info("Successfully created calendar event", {
      userId: user.id,
      taskId: task.id,
      eventId: result.value.eventId,
    });

    return result.value;
  });

const createCalendarEventsForTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()),
  duration: z.number().min(15).max(480).optional(),
});

/**
 * Server action to create calendar events for multiple tasks
 */
export const createCalendarEventsForTasks = authorizedActionClient
  .metadata({ policy: "tasks:update" })
  .schema(createCalendarEventsForTasksSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      throw ActionErrors.badRequest("Google account not connected");
    }

    // Get tasks filtered by organization
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId));

    const tasksToCreate = userTasks.filter((task) =>
      parsedInput.taskIds.includes(task.id)
    );

    if (tasksToCreate.length === 0) {
      throw ActionErrors.notFound("Tasks", "create-calendar-events-for-tasks");
    }

    // Create events
    const result = await GoogleCalendarService.createEventsFromTasks(
      user.id,
      organizationId,
      tasksToCreate,
      { duration: parsedInput.duration }
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "create-calendar-events-for-tasks"
      );
    }

    return result.value;
  });

