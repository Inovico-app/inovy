import { pgTable, text, timestamp, uuid, real, integer, boolean } from "drizzle-orm/pg-core";
import { recordings } from "./recordings";
import { projects } from "./projects";

export const taskPriorityEnum = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof taskPriorityEnum)[number];

export const taskStatusEnum = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof taskStatusEnum)[number];

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority", { enum: taskPriorityEnum })
    .notNull()
    .default("medium"),
  status: text("status", { enum: taskStatusEnum }).notNull().default("pending"),
  assigneeId: text("assignee_id"), // Kinde user ID
  assigneeName: text("assignee_name"), // Extracted from transcription
  dueDate: timestamp("due_date", { withTimezone: true }),
  confidenceScore: real("confidence_score"), // AI confidence in task extraction
  meetingTimestamp: integer("meeting_timestamp"), // Timestamp in recording (seconds)
  organizationId: text("organization_id").notNull(), // Kinde organization code
  createdById: text("created_by_id").notNull(), // Kinde user ID who created (or AI)
  isManuallyEdited: text("is_manually_edited")
    .notNull()
    .default("false")
    .$type<"true" | "false">(), // Track if task has been manually edited
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }), // Last manual edit timestamp
  lastEditedById: text("last_edited_by_id"), // Kinde user ID who last edited
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }),
  lastEditedById: text("last_edited_by_id"),
  lastEditedByName: text("last_edited_by_name"),
  isManuallyEdited: boolean("is_manually_edited").notNull().default(false),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

