"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { policyToPermissions } from "@/lib/permission-helpers";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { IntegrationSettingsService } from "@/server/services/integration-settings.service";
import {
  updateGoogleSettingsSchema,
  type UpdateGoogleSettingsInput,
} from "@/server/validation/integrations/google-settings";
import { revalidatePath } from "next/cache";
import type { IntegrationSettings } from "@/server/db/schema/integration-settings";
import { z } from "zod";

const getGoogleSettingsSchema = z.object({
  projectId: z.string().optional(),
});

/**
 * Get Google integration settings
 */
export const getGoogleSettings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:read") })
  .schema(getGoogleSettingsSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await IntegrationSettingsService.getSettings(
      user.id,
      "google",
      parsedInput?.projectId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "get-google-settings"
      );
    }

    // Return defaults if no settings exist
    if (!result.value) {
      return {
        id: "",
        userId: user.id,
        provider: "google",
        projectId: parsedInput?.projectId || null,
        autoCalendarEnabled: false,
        autoEmailEnabled: false,
        defaultEventDuration: 30,
        taskPriorityFilter: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IntegrationSettings;
    }

    return result.value;
  });

/**
 * Update Google integration settings
 */
export const updateGoogleSettings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:update") })
  .schema(updateGoogleSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    logger.info("Updating Google integration settings", {
      userId: user.id,
      projectId: parsedInput.projectId,
    });

    const result = await IntegrationSettingsService.updateSettings(
      user.id,
      "google",
      {
        projectId: parsedInput.projectId,
        autoCalendarEnabled: parsedInput.autoCalendarEnabled,
        autoEmailEnabled: parsedInput.autoEmailEnabled,
        defaultEventDuration: parsedInput.defaultEventDuration,
        taskPriorityFilter: parsedInput.taskPriorityFilter,
      }
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "update-google-settings"
      );
    }

    // Revalidate settings page
    revalidatePath("/settings");
    if (parsedInput.projectId) {
      revalidatePath(`/projects/${parsedInput.projectId}`);
    }

    logger.info("Successfully updated Google integration settings", {
      userId: user.id,
    });

    return result.value;
  });

const resetGoogleSettingsSchema = z.object({
  projectId: z.string().optional(),
});

/**
 * Reset Google integration settings to defaults
 */
export const resetGoogleSettings = authorizedActionClient
  .metadata({ permissions: policyToPermissions("settings:update") })
  .schema(resetGoogleSettingsSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await IntegrationSettingsService.deleteSettings(
      user.id,
      "google",
      parsedInput?.projectId
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "reset-google-settings"
      );
    }

    revalidatePath("/settings");
    if (parsedInput?.projectId) {
      revalidatePath(`/projects/${parsedInput.projectId}`);
    }

    return { success: true };
  });
