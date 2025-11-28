import type { ActionResult } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { IntegrationSettingsQueries } from "../data-access/integration-settings.queries";
import { type IntegrationSettings } from "../db/schema/integration-settings";

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
  ): Promise<ActionResult<IntegrationSettings | null>> {
    try {
      const settings = await IntegrationSettingsQueries.getByUserAndProvider(
        userId,
        provider,
        projectId
      );
      return ok(settings);
    } catch (error) {
      const errorMessage = "Failed to get integration settings";
      logger.error(
        errorMessage,
        { userId, provider, projectId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          errorMessage,
          undefined,
          "IntegrationSettingsService.getSettings"
        )
      );
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
  ): Promise<ActionResult<IntegrationSettings>> {
    try {
      // Check if settings exist
      const existing = await IntegrationSettingsQueries.getByUserAndProvider(
        userId,
        provider,
        data.projectId
      );

      if (existing) {
        // Update existing settings
        const updated = await IntegrationSettingsQueries.update(existing.id, {
          autoCalendarEnabled:
            data.autoCalendarEnabled ?? existing.autoCalendarEnabled,
          autoEmailEnabled: data.autoEmailEnabled ?? existing.autoEmailEnabled,
          defaultEventDuration:
            data.defaultEventDuration ?? existing.defaultEventDuration,
          taskPriorityFilter:
            data.taskPriorityFilter ?? existing.taskPriorityFilter,
        });

        if (!updated) {
          return err(
            ActionErrors.internal(
              "Failed to update settings",
              undefined,
              "IntegrationSettingsService.updateSettings"
            )
          );
        }

        logger.info("Updated integration settings", { userId, provider });
        return ok(updated);
      }

      // Create new settings
      const created = await IntegrationSettingsQueries.create({
        userId,
        provider,
        projectId: data.projectId ?? null,
        autoCalendarEnabled: data.autoCalendarEnabled ?? false,
        autoEmailEnabled: data.autoEmailEnabled ?? false,
        defaultEventDuration: data.defaultEventDuration ?? 30,
        taskPriorityFilter: data.taskPriorityFilter ?? null,
      });

      logger.info("Created integration settings", { userId, provider });
      return ok(created);
    } catch (error) {
      logger.error(
        "Failed to update integration settings",
        { userId, provider, projectId: data.projectId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to update integration settings",
          error as Error,
          "IntegrationSettingsService.updateSettings"
        )
      );
    }
  }

  /**
   * Delete settings (reset to defaults)
   */
  static async deleteSettings(
    userId: string,
    provider: "google" | "microsoft",
    projectId?: string
  ): Promise<ActionResult<boolean>> {
    try {
      await IntegrationSettingsQueries.delete(userId, provider, projectId);
      logger.info("Deleted integration settings", {
        userId,
        provider,
        projectId,
      });
      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to delete integration settings",
        { userId, provider, projectId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete integration settings",
          error as Error,
          "IntegrationSettingsService.deleteSettings"
        )
      );
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
  ): Promise<ActionResult<boolean>> {
    try {
      const settingsResult = await this.getSettings(
        userId,
        provider,
        projectId
      );

      if (settingsResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get integration settings",
            settingsResult.error,
            "IntegrationSettingsService.shouldTriggerAutoAction"
          )
        );
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
        const priorityAllowed =
          settings.taskPriorityFilter.includes(taskPriority);
        return ok(priorityAllowed);
      }

      // If no filter set, allow all
      return ok(true);
    } catch (error) {
      const errorMessage = "Failed to check auto-action trigger";
      logger.error(
        errorMessage,
        { userId, provider, actionType, taskPriority, projectId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          errorMessage,
          undefined,
          "IntegrationSettingsService.shouldTriggerAutoAction"
        )
      );
    }
  }
}

