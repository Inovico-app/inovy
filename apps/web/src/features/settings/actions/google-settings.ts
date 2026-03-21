"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import type { IntegrationSettings } from "@/server/db/schema/integration-settings";
import { IntegrationSettingsService } from "@/server/services/integration-settings.service";
import { updateGoogleSettingsSchema } from "@/server/validation/integrations/google-settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const getGoogleSettingsSchema = z.object({
  projectId: z.string().optional(),
});

/**
 * Get Google integration settings
 */
export const getGoogleSettings = authorizedActionClient
  .metadata({
    name: "get-google-settings",
    permissions: policyToPermissions("settings:read"),
    audit: { resourceType: "integration", action: "get", category: "read" },
  })
  .schema(getGoogleSettingsSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await IntegrationSettingsService.getSettings(
      user.id,
      "google",
      parsedInput?.projectId,
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "get-google-settings",
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
  .metadata({
    name: "update-google-settings",
    permissions: policyToPermissions("settings:update"),
    audit: {
      resourceType: "integration",
      action: "update",
      category: "mutation",
    },
  })
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
      },
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "update-google-settings",
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
  .metadata({
    name: "reset-google-settings",
    permissions: policyToPermissions("settings:update"),
    audit: {
      resourceType: "integration",
      action: "reset",
      category: "mutation",
    },
  })
  .schema(resetGoogleSettingsSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await IntegrationSettingsService.deleteSettings(
      user.id,
      "google",
      parsedInput?.projectId,
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "reset-google-settings",
      );
    }

    revalidatePath("/settings");
    if (parsedInput?.projectId) {
      revalidatePath(`/projects/${parsedInput.projectId}`);
    }

    return { success: true };
  });
