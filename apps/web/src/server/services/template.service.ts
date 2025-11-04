import { type Result, err, ok } from "neverthrow";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  integrationTemplates,
  type IntegrationTemplate,
  type EmailTemplateContent,
  type CalendarTemplateContent,
} from "../db/schema";
import { logger } from "../../lib/logger";

/**
 * Template Service
 * Manages email and calendar event templates with variable substitution
 */
export class TemplateService {
  /**
   * Get user's templates
   */
  static async getTemplates(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar"
  ): Promise<Result<IntegrationTemplate[], string>> {
    try {
      const templates = await db
        .select()
        .from(integrationTemplates)
        .where(
          and(
            eq(integrationTemplates.userId, userId),
            eq(integrationTemplates.provider, provider),
            eq(integrationTemplates.templateType, templateType)
          )
        );

      return ok(templates);
    } catch (error) {
      const errorMessage = `Failed to get templates: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(
        errorMessage,
        { userId, provider, templateType },
        error as Error
      );
      return err(errorMessage);
    }
  }

  /**
   * Get default template
   */
  static async getDefaultTemplate(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar"
  ): Promise<Result<IntegrationTemplate | null, string>> {
    try {
      const [template] = await db
        .select()
        .from(integrationTemplates)
        .where(
          and(
            eq(integrationTemplates.userId, userId),
            eq(integrationTemplates.provider, provider),
            eq(integrationTemplates.templateType, templateType),
            eq(integrationTemplates.isDefault, true)
          )
        )
        .limit(1);

      return ok(template || null);
    } catch (error) {
      const errorMessage = `Failed to get default template: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(
        errorMessage,
        { userId, provider, templateType },
        error as Error
      );
      return err(errorMessage);
    }
  }

  /**
   * Create or update template
   */
  static async saveTemplate(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar",
    data: {
      id?: string;
      name: string;
      content: EmailTemplateContent | CalendarTemplateContent;
      isDefault?: boolean;
    }
  ): Promise<Result<IntegrationTemplate, string>> {
    try {
      // If setting as default, unset other defaults first
      if (data.isDefault) {
        await db
          .update(integrationTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(integrationTemplates.userId, userId),
              eq(integrationTemplates.provider, provider),
              eq(integrationTemplates.templateType, templateType)
            )
          );
      }

      // Update existing template
      if (data.id) {
        const [updated] = await db
          .update(integrationTemplates)
          .set({
            name: data.name,
            content: data.content,
            isDefault: data.isDefault || false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(integrationTemplates.id, data.id),
              eq(integrationTemplates.userId, userId)
            )
          )
          .returning();

        if (!updated) {
          return err("Failed to update template");
        }

        logger.info("Updated template", { userId, templateId: data.id });
        return ok(updated);
      }

      // Create new template
      const [created] = await db
        .insert(integrationTemplates)
        .values({
          userId,
          provider,
          templateType,
          name: data.name,
          content: data.content,
          isDefault: data.isDefault || false,
        })
        .returning();

      if (!created) {
        return err("Failed to create template");
      }

      logger.info("Created template", { userId, templateId: created.id });
      return ok(created);
    } catch (error) {
      const errorMessage = `Failed to save template: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(
        errorMessage,
        { userId, provider, templateType },
        error as Error
      );
      return err(errorMessage);
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(
    templateId: string,
    userId: string
  ): Promise<Result<boolean, string>> {
    try {
      await db
        .delete(integrationTemplates)
        .where(
          and(
            eq(integrationTemplates.id, templateId),
            eq(integrationTemplates.userId, userId)
          )
        );

      logger.info("Deleted template", { userId, templateId });
      return ok(true);
    } catch (error) {
      const errorMessage = `Failed to delete template: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      logger.error(errorMessage, { userId, templateId }, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Render email template with variable substitution
   */
  static renderEmailTemplate(
    template: EmailTemplateContent,
    variables: {
      summary?: string;
      date?: string;
      project?: string;
      recordingTitle?: string;
      duration?: string;
      [key: string]: string | undefined;
    }
  ): EmailTemplateContent {
    const substitute = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    return {
      subject: substitute(template.subject),
      body: substitute(template.body),
      footer: template.footer ? substitute(template.footer) : undefined,
    };
  }

  /**
   * Render calendar template with variable substitution
   */
  static renderCalendarTemplate(
    template: CalendarTemplateContent,
    variables: {
      taskTitle?: string;
      taskDescription?: string;
      priority?: string;
      assignee?: string;
      [key: string]: string | undefined;
    }
  ): CalendarTemplateContent {
    const substitute = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    return {
      titleFormat: substitute(template.titleFormat),
      descriptionFormat: substitute(template.descriptionFormat),
      location: template.location ? substitute(template.location) : undefined,
      reminders: template.reminders,
      colorId: template.colorId,
      visibility: template.visibility,
      defaultAttendees: template.defaultAttendees,
    };
  }

  /**
   * Get default email template content
   */
  static getDefaultEmailContent(): EmailTemplateContent {
    return {
      subject: "Meeting Summary: {{recordingTitle}}",
      body: `<h2>{{recordingTitle}}</h2>

<p><strong>Date:</strong> {{date}}</p>
<p><strong>Duration:</strong> {{duration}}</p>

<h3>Summary</h3>
{{summary}}`,
      footer: `<p>This summary was generated by Inovy.</p>`,
    };
  }

  /**
   * Get default calendar template content
   */
  static getDefaultCalendarContent(): CalendarTemplateContent {
    return {
      titleFormat: "{{taskTitle}}",
      descriptionFormat: `Task: {{taskTitle}}

Description: {{taskDescription}}

Priority: {{priority}}
Assigned to: {{assignee}}

Created from Inovy recording`,
      reminders: [15],
      visibility: "default",
    };
  }
}

