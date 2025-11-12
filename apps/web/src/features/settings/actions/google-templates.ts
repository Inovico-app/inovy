"use server";

import { authorizedActionClient } from "@/lib/action-client";
import { ActionErrors } from "@/lib/action-errors";
import { logger } from "@/lib/logger";
import { TemplateService } from "@/server/services/template.service";
import type {
  IntegrationTemplate,
  EmailTemplateContent,
  CalendarTemplateContent,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Get email templates
 */
export const getEmailTemplates = authorizedActionClient
  .metadata({ policy: "settings:read" })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await TemplateService.getTemplates(user.id, "google", "email");

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "get-email-templates"
      );
    }

    return result.value;
  });

/**
 * Get calendar templates
 */
export const getCalendarTemplates = authorizedActionClient
  .metadata({ policy: "settings:read" })
  .schema(z.void())
  .action(async ({ ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await TemplateService.getTemplates(
      user.id,
      "google",
      "calendar"
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "get-calendar-templates"
      );
    }

    return result.value;
  });

const saveEmailTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  content: z.custom<EmailTemplateContent>(),
  isDefault: z.boolean().optional(),
});

/**
 * Save email template
 */
export const saveEmailTemplate = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(saveEmailTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await TemplateService.saveTemplate(user.id, "google", "email", parsedInput);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "save-email-template"
      );
    }

    revalidatePath("/settings");

    return result.value;
  });

const saveCalendarTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  content: z.custom<CalendarTemplateContent>(),
  isDefault: z.boolean().optional(),
});

/**
 * Save calendar template
 */
export const saveCalendarTemplate = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(saveCalendarTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await TemplateService.saveTemplate(
      user.id,
      "google",
      "calendar",
      parsedInput
    );

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "save-calendar-template"
      );
    }

    revalidatePath("/settings");

    return result.value;
  });

const deleteTemplateSchema = z.object({
  templateId: z.string(),
});

/**
 * Delete template
 */
export const deleteTemplate = authorizedActionClient
  .metadata({ policy: "settings:update" })
  .schema(deleteTemplateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated("User context required");
    }

    const result = await TemplateService.deleteTemplate(parsedInput.templateId, user.id);

    if (result.isErr()) {
      throw ActionErrors.internal(
        result.error.message,
        result.error,
        "delete-template"
      );
    }

    revalidatePath("/settings");

    return { success: true };
  });
