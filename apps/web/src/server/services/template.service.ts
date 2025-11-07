import { ActionErrors, type ActionResult } from "@/lib";
import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { IntegrationTemplatesQueries } from "../data-access/integration-templates.queries";
import {
  type CalendarTemplateContent,
  type EmailTemplateContent,
  type IntegrationTemplate,
} from "../db/schema";

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
  ): Promise<ActionResult<IntegrationTemplate[]>> {
    try {
      const templates = await IntegrationTemplatesQueries.getByUser(
        userId,
        provider,
        templateType
      );
      return ok(templates);
    } catch (error) {
      const errorMessage = "Failed to get templates";
      logger.error(
        errorMessage,
        { userId, provider, templateType },
        error as Error
      );
      return err(
        ActionErrors.internal(
          errorMessage,
          undefined,
          "TemplateService.getTemplates"
        )
      );
    }
  }

  /**
   * Get default template
   */
  static async getDefaultTemplate(
    userId: string,
    provider: "google" | "microsoft",
    templateType: "email" | "calendar"
  ): Promise<ActionResult<IntegrationTemplate | null>> {
    try {
      const template = await IntegrationTemplatesQueries.getDefault(
        userId,
        provider,
        templateType
      );
      return ok(template);
    } catch (error) {
      const errorMessage = "Failed to get default template";
      logger.error(
        errorMessage,
        { userId, provider, templateType },
        error as Error
      );
      return err(
        ActionErrors.internal(
          errorMessage,
          undefined,
          "TemplateService.getDefaultTemplate"
        )
      );
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
  ): Promise<ActionResult<IntegrationTemplate>> {
    try {
      // If setting as default, unset other defaults first
      if (data.isDefault) {
        await IntegrationTemplatesQueries.unsetDefaults(
          userId,
          provider,
          templateType
        );
      }

      // Update existing template
      if (data.id) {
        const updated = await IntegrationTemplatesQueries.update(
          data.id,
          userId,
          {
            name: data.name,
            content: data.content,
            isDefault: data.isDefault ?? false,
          }
        );

        if (!updated) {
          return err(
            ActionErrors.notFound("Template", "TemplateService.saveTemplate")
          );
        }

        logger.info("Updated template", { userId, templateId: data.id });
        return ok(updated);
      }

      // Create new template
      const created = await IntegrationTemplatesQueries.create({
        userId,
        provider,
        templateType,
        name: data.name,
        content: data.content,
        isDefault: data.isDefault ?? false,
      });

      logger.info("Created template", { userId, templateId: created.id });
      return ok(created);
    } catch (error) {
      logger.error(
        "Failed to save template",
        { userId, provider, templateType },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to save template",
          error as Error,
          "TemplateService.saveTemplate"
        )
      );
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(
    templateId: string,
    userId: string
  ): Promise<ActionResult<boolean>> {
    try {
      await IntegrationTemplatesQueries.delete(templateId, userId);
      logger.info("Deleted template", { userId, templateId });
      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to delete template",
        { userId, templateId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to delete template",
          error as Error,
          "TemplateService.deleteTemplate"
        )
      );
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
  ): ActionResult<EmailTemplateContent> {
    const substitute = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] ?? match;
      });
    };

    return ok({
      subject: substitute(template.subject),
      body: substitute(template.body),
      footer: template.footer ? substitute(template.footer) : undefined,
    });
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
  ): ActionResult<CalendarTemplateContent> {
    const substitute = (text: string): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] ?? match;
      });
    };

    return ok({
      titleFormat: substitute(template.titleFormat),
      descriptionFormat: substitute(template.descriptionFormat),
      location: template.location ? substitute(template.location) : undefined,
      reminders: template.reminders,
      colorId: template.colorId,
      visibility: template.visibility,
      defaultAttendees: template.defaultAttendees,
    });
  }

  /**
   * Get default email template content
   */
  static getDefaultEmailContent(): ActionResult<EmailTemplateContent> {
    return ok({
      subject: "Meeting Summary: {{recordingTitle}}",
      body: `<h2>{{recordingTitle}}</h2>

<p><strong>Date:</strong> {{date}}</p>
<p><strong>Duration:</strong> {{duration}}</p>

<h3>Summary</h3>
{{summary}}`,
      footer: `<p>This summary was generated by Inovy.</p>`,
    });
  }

  /**
   * Get default calendar template content
   */
  static getDefaultCalendarContent(): ActionResult<CalendarTemplateContent> {
    return ok({
      titleFormat: "{{taskTitle}}",
      descriptionFormat: `Task: {{taskTitle}}

Description: {{taskDescription}}

Priority: {{priority}}
Assigned to: {{assignee}}

Created from Inovy recording`,
      reminders: [15],
      visibility: "default",
    });
  }
}

