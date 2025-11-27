import { pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const integrationProviderEnum = ["google", "microsoft"] as const;
export type IntegrationProvider = (typeof integrationProviderEnum)[number];

/**
 * Integration Settings Table
 * User preferences for automatic actions (calendar events, email drafts)
 * Can be set globally per user or overridden per project
 */
export const integrationSettings = pgTable("integration_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Better Auth user ID
  provider: text("provider", { enum: integrationProviderEnum }).notNull(),
  projectId: uuid("project_id").references(() => projects.id), // Null = global setting
  autoCalendarEnabled: boolean("auto_calendar_enabled")
    .notNull()
    .default(false),
  autoEmailEnabled: boolean("auto_email_enabled").notNull().default(false),
  defaultEventDuration: integer("default_event_duration")
    .notNull()
    .default(30), // Minutes
  taskPriorityFilter: text("task_priority_filter").array(), // Which priorities trigger auto-actions (null = all)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type IntegrationSettings = typeof integrationSettings.$inferSelect;
export type NewIntegrationSettings = typeof integrationSettings.$inferInsert;

