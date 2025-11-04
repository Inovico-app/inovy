import { type Result, err, ok } from "neverthrow";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "../db";
import { integrationSettings, type IntegrationSettings } from "../db/schema";
import { logger } from "../../lib/logger";

/**
 * Integration Settings Service
 * Manages user preferences for automatic actions
 */
export class IntegrationSettingsService {
  /**
   * Get settings for a user (global or project-specific)
   */
  static async getSettings(
    userId: string,
    provider: "google" | "microsoft",
    projectId?: string
  ): Promise<Result<IntegrationSettings | null, string>> {
    try {
      // First try to get project-specific settings if projectId provided
      if (projectId) {
        const [projectSettings] = await db
          .select()
          .from(integrationSettings)
          .where(
            and(
              eq(integrationSettings.userId, userId),
              eq(integrationSettings.provider, provider),
              eq(integrationSettings.projectId, projectId)
            )
          )
          .limit(1);

        if (projectSettings) {
          return ok(projectSettings);
        }
      }

      // Fall back to global settings
      const [globalSettings] = await db
        .select()
        .from(integrationSettings)
        .where(
          and(
            eq(integrationSettings.userId, userId),
            eq(integrationSettings.provider, provider),
            isNull(integrationSettings.projectId)
          )
        )
        .limit(1);

      return ok(globalSettings || null);
    } catch (error) {
      const errorMessage = `Failed to get integration settings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId, provider, projectId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Update or create settings
   */
  static async updateSettings(
    userId: string,
    provider: "google" | "microsoft",
    data: {
      projectId?: string;
      autoCalendarEnabled?: boolean;
      autoEmailEnabled?: boolean;
      defaultEventDuration?: number;
      taskPriorityFilter?: string[];
    }
  ): Promise<Result<IntegrationSettings, string>> {
    try {
      // Check if settings exist
      const existing = await this.getSettings(
        userId,
        provider,
        data.projectId || undefined
      );

      if (existing.isOk() && existing.value) {
        // Update existing settings
        const [updated] = await db
          .update(integrationSettings)
          .set({
            autoCalendarEnabled:
              data.autoCalendarEnabled ?? existing.value.autoCalendarEnabled,
            autoEmailEnabled:
              data.autoEmailEnabled ?? existing.value.autoEmailEnabled,
            defaultEventDuration:
              data.defaultEventDuration ?? existing.value.defaultEventDuration,
            taskPriorityFilter:
              data.taskPriorityFilter !== undefined
                ? data.taskPriorityFilter
                : existing.value.taskPriorityFilter,
            updatedAt: new Date(),
          })
          .where(eq(integrationSettings.id, existing.value.id))
          .returning();

        if (!updated) {
          return err("Failed to update settings");
        }

        logger.info("Updated integration settings", { userId, provider });
        return ok(updated);
      }

      // Create new settings
      const [created] = await db
        .insert(integrationSettings)
        .values({
          userId,
          provider,
          projectId: data.projectId || null,
          autoCalendarEnabled: data.autoCalendarEnabled ?? false,
          autoEmailEnabled: data.autoEmailEnabled ?? false,
          defaultEventDuration: data.defaultEventDuration ?? 30,
          taskPriorityFilter: data.taskPriorityFilter || null,
        })
        .returning();

      if (!created) {
        return err("Failed to create settings");
      }

      logger.info("Created integration settings", { userId, provider });
      return ok(created);
    } catch (error) {
      const errorMessage = `Failed to update integration settings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(
        errorMessage,
        { userId, provider, projectId: data.projectId },
        error as Error
      );
      return err(errorMessage);
    }
  }

  /**
   * Delete settings (reset to defaults)
   */
  static async deleteSettings(
    userId: string,
    provider: "google" | "microsoft",
    projectId?: string
  ): Promise<Result<boolean, string>> {
    try {
      await db
        .delete(integrationSettings)
        .where(
          and(
            eq(integrationSettings.userId, userId),
            eq(integrationSettings.provider, provider),
            projectId
              ? eq(integrationSettings.projectId, projectId)
              : isNull(integrationSettings.projectId)
          )
        );

      logger.info("Deleted integration settings", { userId, provider, projectId });
      return ok(true);
    } catch (error) {
      const errorMessage = `Failed to delete integration settings: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId, provider, projectId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Check if auto-action should be triggered based on settings
   */
  static async shouldTriggerAutoAction(
    userId: string,
    provider: "google" | "microsoft",
    actionType: "calendar" | "email",
    taskPriority?: string,
    projectId?: string
  ): Promise<Result<boolean, string>> {
    try {
      const settingsResult = await this.getSettings(userId, provider, projectId);

      if (settingsResult.isErr()) {
        return err(settingsResult.error);
      }

      const settings = settingsResult.value;

      // If no settings, defaults are all disabled
      if (!settings) {
        return ok(false);
      }

      // Check if the action type is enabled
      const isEnabled =
        actionType === "calendar"
          ? settings.autoCalendarEnabled
          : settings.autoEmailEnabled;

      if (!isEnabled) {
        return ok(false);
      }

      // Check priority filter (if set and task has priority)
      if (
        taskPriority &&
        settings.taskPriorityFilter &&
        settings.taskPriorityFilter.length > 0
      ) {
        const priorityAllowed = settings.taskPriorityFilter.includes(taskPriority);
        return ok(priorityAllowed);
      }

      // If no filter set, allow all
      return ok(true);
    } catch (error) {
      const errorMessage = `Failed to check auto-action trigger: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(
        errorMessage,
        { userId, provider, actionType, taskPriority, projectId },
        error as Error
      );
      return err(errorMessage);
    }
  }
}

