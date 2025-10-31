import { pgTable, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const recordingStatusEnum = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type RecordingStatus = (typeof recordingStatusEnum)[number];

export const recordingModeEnum = ["live", "upload"] as const;
export type RecordingMode = (typeof recordingModeEnum)[number];

export const recordingArchiveStatusEnum = ["active", "archived"] as const;
export type RecordingArchiveStatus =
  (typeof recordingArchiveStatusEnum)[number];

export const recordings = pgTable("recordings", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileMimeType: text("file_mime_type").notNull(),
  duration: integer("duration"), // in seconds
  recordingDate: timestamp("recording_date", { withTimezone: true }).notNull(),
  transcriptionStatus: text("transcription_status", {
    enum: recordingStatusEnum,
  })
    .notNull()
    .default("pending"),
  transcriptionText: text("transcription_text"),
  recordingMode: text("recording_mode", { enum: recordingModeEnum })
    .notNull()
    .default("upload"),
  language: text("language").notNull().default("nl"), // ISO 639-1 language code
  status: text("status", { enum: recordingArchiveStatusEnum })
    .notNull()
    .default("active"),
  organizationId: text("organization_id").notNull(), // Kinde organization code
  createdById: text("created_by_id").notNull(), // Kinde user ID
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;

