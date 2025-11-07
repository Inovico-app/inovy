"use server";

import { getUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { TemplateService } from "@/server/services/template.service";
import type {
  IntegrationTemplate,
  EmailTemplateContent,
  CalendarTemplateContent,
} from "@/server/db/schema";
import { revalidatePath } from "next/cache";

/**
 * Get email templates
 */
export async function getEmailTemplates(): Promise<{
  success: boolean;
  data?: IntegrationTemplate[];
  error?: string;
}> {
  try {
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const result = await TemplateService.getTemplates(user.id, "google", "email");

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error in getEmailTemplates", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get calendar templates
 */
export async function getCalendarTemplates(): Promise<{
  success: boolean;
  data?: IntegrationTemplate[];
  error?: string;
}> {
  try {
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const result = await TemplateService.getTemplates(
      user.id,
      "google",
      "calendar"
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error in getCalendarTemplates", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Save email template
 */
export async function saveEmailTemplate(input: {
  id?: string;
  name: string;
  content: EmailTemplateContent;
  isDefault?: boolean;
}): Promise<{
  success: boolean;
  data?: IntegrationTemplate;
  error?: string;
}> {
  try {
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const result = await TemplateService.saveTemplate(user.id, "google", "email", input);

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    revalidatePath("/settings");

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error in saveEmailTemplate", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Save calendar template
 */
export async function saveCalendarTemplate(input: {
  id?: string;
  name: string;
  content: CalendarTemplateContent;
  isDefault?: boolean;
}): Promise<{
  success: boolean;
  data?: IntegrationTemplate;
  error?: string;
}> {
  try {
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const result = await TemplateService.saveTemplate(
      user.id,
      "google",
      "calendar",
      input
    );

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    revalidatePath("/settings");

    return {
      success: true,
      data: result.value,
    };
  } catch (error) {
    logger.error("Unexpected error in saveCalendarTemplate", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userResult = await getUserSession();

    if (userResult.isErr() || !userResult.value) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    const user = userResult.value;

    const result = await TemplateService.deleteTemplate(templateId, user.id);

    if (result.isErr()) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    revalidatePath("/settings");

    return {
      success: true,
    };
  } catch (error) {
    logger.error("Unexpected error in deleteTemplate", {}, error as Error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

