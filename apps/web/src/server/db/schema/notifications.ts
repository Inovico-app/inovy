import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { recordings } from "./recordings";

export const notificationTypeEnum = [
  "transcription_completed",
  "transcription_failed",
  "transcription_queued",
  "summary_completed",
  "summary_failed",
  "tasks_completed",
  "tasks_failed",
  "recording_processed",
  "bot_consent_request",
  "bot_session_update",
  "meeting_prep_reminder",
  "meeting_followup_ready",
  "meeting_post_action_complete",
  "task_assigned",
] as const;
export type NotificationType = (typeof notificationTypeEnum)[number];

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordingId: uuid("recording_id").references(() => recordings.id, {
      onDelete: "set null",
      onUpdate: "no action",
    }), // Nullable for bot_consent_request notifications; detach when recording is deleted
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    userId: text("user_id").notNull(), // Better Auth user ID
    organizationId: text("organization_id").notNull(), // Better Auth organization ID
    type: text("type", { enum: notificationTypeEnum }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    metadata: jsonb("metadata"), // Additional context (error details, counts, etc.)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (table) => ({
    userOrgReadIdx: index("notifications_user_org_read_idx").on(
      table.userId,
      table.organizationId,
      table.isRead,
    ),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
