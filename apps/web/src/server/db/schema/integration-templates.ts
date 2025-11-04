import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";

export const templateProviderEnum = ["google", "microsoft"] as const;
export type TemplateProvider = (typeof templateProviderEnum)[number];

export const templateTypeEnum = ["email", "calendar"] as const;
export type TemplateType = (typeof templateTypeEnum)[number];

/**
 * Template content structure for email templates
 */
export interface EmailTemplateContent {
  subject: string; // Template for email subject with variables
  body: string; // Template for email body with variables (HTML supported)
  footer?: string; // Optional footer with metadata
}

/**
 * Template content structure for calendar event templates
 */
export interface CalendarTemplateContent {
  titleFormat: string; // Template for event title
  descriptionFormat: string; // Template for event description
  location?: string; // Default location
  reminders?: number[]; // Default reminder times in minutes [15, 30]
  colorId?: string; // Calendar color ID
  visibility?: "default" | "public" | "private";
  defaultAttendees?: string[]; // Default attendee emails
}

/**
 * Integration Templates Table
 * Customizable templates for email drafts and calendar events
 * Supports variable substitution: {{summary}}, {{date}}, {{project}}, etc.
 */
export const integrationTemplates = pgTable("integration_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Kinde user ID
  provider: text("provider", { enum: templateProviderEnum }).notNull(),
  templateType: text("template_type", { enum: templateTypeEnum }).notNull(),
  name: text("name").notNull(), // User-friendly name (e.g., "Default", "Formal", "Brief")
  content: jsonb("content")
    .notNull()
    .$type<EmailTemplateContent | CalendarTemplateContent>(),
  isDefault: boolean("is_default").notNull().default(false), // One default per user/provider/type
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IntegrationTemplate = typeof integrationTemplates.$inferSelect;
export type NewIntegrationTemplate = typeof integrationTemplates.$inferInsert;

