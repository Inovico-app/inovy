import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { recordings } from "./recordings";
import { projects } from "./projects";

export const notificationTypeEnum = [
  "transcription_completed",
  "transcription_failed",
  "summary_completed",
  "summary_failed",
  "tasks_completed",
  "tasks_failed",
  "recording_processed",
] as const;
export type NotificationType = (typeof notificationTypeEnum)[number];

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  userId: text("user_id").notNull(), // Kinde user ID
  organizationId: text("organization_id").notNull(), // Kinde organization code
  type: text("type", { enum: notificationTypeEnum }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: jsonb("metadata"), // Additional context (error details, counts, etc.)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

