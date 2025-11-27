import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { recordings } from "./recordings";

export const autoActionTypeEnum = ["calendar_event", "email_draft"] as const;
export type AutoActionType = (typeof autoActionTypeEnum)[number];

export const autoActionProviderEnum = ["google", "microsoft"] as const;
export type AutoActionProvider = (typeof autoActionProviderEnum)[number];

export const autoActionStatusEnum = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type AutoActionStatus = (typeof autoActionStatusEnum)[number];

/**
 * Auto Actions Table
 * Tracks automatic actions (calendar events, email drafts) created from AI insights
 * Used for status monitoring, retry logic, and audit trail
 */
export const autoActions = pgTable("auto_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Better Auth user ID
  type: text("type", { enum: autoActionTypeEnum }).notNull(),
  provider: text("provider", { enum: autoActionProviderEnum }).notNull(),
  taskId: uuid("task_id").references(() => tasks.id), // Optional: for calendar events from tasks
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id), // Required: source recording
  status: text("status", { enum: autoActionStatusEnum })
    .notNull()
    .default("pending"),
  errorMessage: text("error_message"), // Error details for failed actions
  retryCount: integer("retry_count").notNull().default(0),
  externalId: text("external_id"), // ID from external system (Google Event ID, Gmail Draft ID)
  externalUrl: text("external_url"), // Direct link to created resource
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }), // When action completed/failed
});

export type AutoAction = typeof autoActions.$inferSelect;
export type NewAutoAction = typeof autoActions.$inferInsert;

