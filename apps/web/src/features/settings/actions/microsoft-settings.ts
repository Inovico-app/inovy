"use server";

import { logger } from "@/lib/logger";
import { policyToPermissions } from "@/lib/rbac/permission-helpers";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import type { IntegrationSettings } from "@/server/db/schema/integration-settings";
import { IntegrationSettingsService } from "@/server/services/integration-settings.service";
import { updateMicrosoftSettingsSchema } from "@/server/validation/integrations/microsoft-settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const getMicrosoftSettingsSchema = z.object({
  projectId: z.string().optional(),
});

/**
 * Get Microsoft integration settings
 */
export const getMicrosoftSettings = authorizedActionClient
  .metadata({
    name: "get-microsoft-settings",
    permissions: policyToPermissions("settings:read"),
    audit: { resourceType: "integration", action: "get", category: "read" },
  })
  .schema(getMicrosoftSettingsSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await IntegrationSettingsService.getSettings(
      user.id,
      "microsoft",
      parsedInput?.projectId,
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "get-microsoft-settings",
      );
    }

    // Return defaults if no settings exist
    if (!result.value) {
      return {
        id: "",
        userId: user.id,
        provider: "microsoft",
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
 * Update Microsoft integration settings
 */
export const updateMicrosoftSettings = authorizedActionClient
  .metadata({
    name: "update-microsoft-settings",
    permissions: policyToPermissions("settings:update"),
    audit: {
      resourceType: "integration",
      action: "update",
      category: "mutation",
    },
  })
  .schema(updateMicrosoftSettingsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    logger.info("Updating Microsoft integration settings", {
      userId: user.id,
      projectId: parsedInput.projectId,
    });

    const result = await IntegrationSettingsService.updateSettings(
      user.id,
      "microsoft",
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
        "update-microsoft-settings",
      );
    }

    // Revalidate settings page
    revalidatePath("/settings");
    if (parsedInput.projectId) {
      revalidatePath(`/projects/${parsedInput.projectId}`);
    }

    logger.info("Successfully updated Microsoft integration settings", {
      userId: user.id,
    });

    return result.value;
  });

const resetMicrosoftSettingsSchema = z.object({
  projectId: z.string().optional(),
});

/**
 * Reset Microsoft integration settings to defaults
 */
export const resetMicrosoftSettings = authorizedActionClient
  .metadata({
    name: "reset-microsoft-settings",
    permissions: policyToPermissions("settings:update"),
    audit: {
      resourceType: "integration",
      action: "reset",
      category: "mutation",
    },
  })
  .schema(resetMicrosoftSettingsSchema.optional())
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await IntegrationSettingsService.deleteSettings(
      user.id,
      "microsoft",
      parsedInput?.projectId,
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "reset-microsoft-settings",
      );
    }

    revalidatePath("/settings");
    if (parsedInput?.projectId) {
      revalidatePath(`/projects/${parsedInput.projectId}`);
    }

    return { success: true };
  });
