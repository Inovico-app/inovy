"use server";

import { z } from "zod";
import { getUserSession } from "@/lib/auth";
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

type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

/**
 * Server action to create a Google Calendar event from a task
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<{
  success: boolean;
  data?: {
    eventId: string;
    eventUrl: string;
  };
  error?: string;
}> {
  try {
    // Validate input
    const validatedData = createCalendarEventSchema.parse(input);

    // Get current user session
    const userResult = await getUserSession();

    if (userResult.isErr()) {
      logger.error("Failed to get user session in createCalendarEvent", {
        error: userResult.error,
      });
      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const user = userResult.value;
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check if user has Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      return {
        success: false,
        error: "Google account not connected. Please connect in settings first.",
      };
    }

    // Get the task
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, validatedData.taskId))
      .limit(1);

    if (!task) {
      return {
        success: false,
        error: "Task not found",
      };
    }

    // Verify task belongs to user's organization
    if (task.organizationId !== user.organization_code) {
      return {
        success: false,
        error: "Unauthorized access to task",
      };
    }

    logger.info("Creating Google Calendar event from task", {
      userId: user.id,
      taskId: task.id,
    });

    // Create calendar event
    const result = await GoogleCalendarService.createEventFromTask(
      user.id,
      task,
      {
        duration: validatedData.duration,
      }
    );

    if (result.isErr()) {
      logger.error("Failed to create calendar event", {
        userId: user.id,
        taskId: task.id,
        error: result.error,
      });

      return {
        success: false,
        error: result.error,
      };
    }

    logger.info("Successfully created calendar event", {
      userId: user.id,
      taskId: task.id,
      eventId: result.value.eventId,
    });

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      logger.warn("Validation error in createCalendarEvent", {
        field: firstIssue.path.join("."),
        message: firstIssue.message,
      });

      return {
        success: false,
        error: firstIssue.message,
      };
    }

    logger.error(
      "Unexpected error in createCalendarEvent",
      {},
      error as Error
    );

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Server action to create calendar events for multiple tasks
 */
export async function createCalendarEventsForTasks(input: {
  taskIds: string[];
  duration?: number;
}): Promise<{
  success: boolean;
  data?: {
    successful: Array<{ taskId: string; eventId: string; eventUrl: string }>;
    failed: Array<{ taskId: string; error: string }>;
  };
  error?: string;
}> {
  try {
    // Get current user session
    const userResult = await getUserSession();

    if (userResult.isErr()) {
      return {
        success: false,
        error: "Failed to authenticate",
      };
    }

    const user = userResult.value;
    if (!user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    // Check Google connection
    const hasConnection = await GoogleOAuthService.hasConnection(user.id);

    if (hasConnection.isErr() || !hasConnection.value) {
      return {
        success: false,
        error: "Google account not connected",
      };
    }

    // Get tasks
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.organizationId, user.organization_code || ""));

    const tasksToCreate = userTasks.filter((task) =>
      input.taskIds.includes(task.id)
    );

    if (tasksToCreate.length === 0) {
      return {
        success: false,
        error: "No valid tasks found",
      };
    }

    // Create events
    const result = await GoogleCalendarService.createEventsFromTasks(
      user.id,
      tasksToCreate,
      { duration: input.duration }
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error,
      };
    }

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error(
      "Unexpected error in createCalendarEventsForTasks",
      {},
      error as Error
    );

    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

