"use server";

import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { db } from "@/server/db";
import { tasks } from "@/server/db/schema/tasks";
import { getCalendarProvider } from "@/server/services/calendar/calendar-provider-factory";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { eq } from "drizzle-orm";
import { z } from "zod";

const createCalendarEventSchema = z.object({
  taskId: z.string().uuid(),
  duration: z.number().min(15).max(480).optional(), // 15 min to 8 hours
});

/**
 * Server action to create a Google Calendar event from a task.
 * Uses the factory to verify calendar connectivity before delegating to
 * GoogleCalendarService for the task-specific event creation logic.
 */
export const createCalendarEvent = authorizedActionClient
  .metadata({ permissions: policyToPermissions("tasks:update") })
  .schema(createCalendarEventSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user has a connected calendar provider
    const providerResult = await getCalendarProvider(user.id);

    if (providerResult.isErr()) {
      throw ActionErrors.badRequest(
        "No calendar account connected. Please connect Google or Microsoft in settings first.",
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
        "createCalendarEvent",
      );
    } catch {
      throw ActionErrors.notFound("Task", "create-calendar-event");
    }

    logger.info("Creating Google Calendar event from task", {
      userId: user.id,
      taskId: task.id,
    });

    // TODO: createEventFromTask is Google-specific. To support Microsoft,
    // add a task-to-event mapping layer that uses CalendarProvider.createEvent.
    const result = await GoogleCalendarService.createEventFromTask(
      user.id,
      organizationId,
      task,
      {
        duration: parsedInput.duration,
      },
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
        "create-calendar-event",
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
 * Server action to create calendar events for multiple tasks.
 * Uses the factory to verify calendar connectivity before delegating to
 * GoogleCalendarService for the task-specific event creation logic.
 */
export const createCalendarEventsForTasks = authorizedActionClient
  .metadata({ permissions: policyToPermissions("tasks:update") })
  .schema(createCalendarEventsForTasksSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { organizationId, user } = ctx;

    if (!organizationId) {
      throw ActionErrors.forbidden("Organization context required");
    }

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    // Check if user has a connected calendar provider
    const providerResult = await getCalendarProvider(user.id);

    if (providerResult.isErr()) {
      throw ActionErrors.badRequest(
        "No calendar account connected. Please connect Google or Microsoft in settings first.",
      );
    }

    // Get tasks filtered by organization
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, organizationId));

    const tasksToCreate = userTasks.filter((task) =>
      parsedInput.taskIds.includes(task.id),
    );

    if (tasksToCreate.length === 0) {
      throw ActionErrors.notFound("Tasks", "create-calendar-events-for-tasks");
    }

    // TODO: createEventsFromTasks is Google-specific. To support Microsoft,
    // add a task-to-event mapping layer that uses CalendarProvider.createEvent.
    const result = await GoogleCalendarService.createEventsFromTasks(
      user.id,
      organizationId,
      tasksToCreate,
      { duration: parsedInput.duration },
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "create-calendar-events-for-tasks",
      );
    }

    return result.value;
  });
