"use server";

import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { IntegrationSettingsService } from "@/server/services/integration-settings.service";
import {
  updateGoogleSettingsSchema,
  type UpdateGoogleSettingsInput,
} from "@/server/validation/integrations/google-settings";
import { revalidatePath } from "next/cache";
import type { IntegrationSettings } from "@/server/db/schema";

/**
 * Get Google integration settings
 */
export async function getGoogleSettings(projectId?: string): Promise<{
  success: boolean;
  data?: IntegrationSettings;
  error?: string;
}> {
  try {
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = sessionResult.value.user;

    const result = await IntegrationSettingsService.getSettings(
      user.id,
      "google",
      projectId
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    // Return defaults if no settings exist
    if (!result.value) {
      return {
        success: true,
        data: {
          id: "",
          userId: user.id,
          provider: "google",
          projectId: projectId || null,
          autoCalendarEnabled: false,
          autoEmailEnabled: false,
          defaultEventDuration: 30,
          taskPriorityFilter: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    }

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error in getGoogleSettings", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update Google integration settings
 */
export async function updateGoogleSettings(
  input: UpdateGoogleSettingsInput
): Promise<{
  success: boolean;
  data?: IntegrationSettings;
  error?: string;
}> {
  try {
    const validatedData = updateGoogleSettingsSchema.parse(input);

    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = sessionResult.value.user;

    logger.info("Updating Google integration settings", {
      userId: user.id,
      projectId: validatedData.projectId,
    });

    const result = await IntegrationSettingsService.updateSettings(
      user.id,
      "google",
      {
        projectId: validatedData.projectId,
        autoCalendarEnabled: validatedData.autoCalendarEnabled,
        autoEmailEnabled: validatedData.autoEmailEnabled,
        defaultEventDuration: validatedData.defaultEventDuration,
        taskPriorityFilter: validatedData.taskPriorityFilter,
      }
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    // Revalidate settings page
    revalidatePath("/settings");
    if (validatedData.projectId) {
      revalidatePath(`/projects/${validatedData.projectId}`);
    }

    logger.info("Successfully updated Google integration settings", {
      userId: user.id,
    });

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error in updateGoogleSettings", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Reset Google integration settings to defaults
 */
export async function resetGoogleSettings(projectId?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sessionResult = await getAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = sessionResult.value.user;

    const result = await IntegrationSettingsService.deleteSettings(
      user.id,
      "google",
      projectId
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    revalidatePath("/settings");
    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }

    return {
      success: true,
    };
  } catch (error) {
    logger.error("Unexpected error in resetGoogleSettings", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

