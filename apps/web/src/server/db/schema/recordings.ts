import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const recordingStatusEnum = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type RecordingStatus = (typeof recordingStatusEnum)[number];

export const recordingModeEnum = ["live", "upload", "bot"] as const;
export type RecordingMode = (typeof recordingModeEnum)[number];

export const recordingArchiveStatusEnum = ["active", "archived"] as const;
export type RecordingArchiveStatus =
  (typeof recordingArchiveStatusEnum)[number];

export const workflowStatusEnum = [
  "idle",
  "running",
  "completed",
  "failed",
] as const;
export type WorkflowStatus = (typeof workflowStatusEnum)[number];

export const recordings = pgTable(
  "recordings",
  {
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
    recordingDate: timestamp("recording_date", {
      withTimezone: true,
    }).notNull(),
    transcriptionStatus: text("transcription_status", {
      enum: recordingStatusEnum,
    })
      .notNull()
      .default("pending"),
    transcriptionText: text("transcription_text"),
    isTranscriptionManuallyEdited: boolean("is_transcription_manually_edited")
      .notNull()
      .default(false),
    transcriptionLastEditedById: text("transcription_last_edited_by_id"),
    transcriptionLastEditedAt: timestamp("transcription_last_edited_at", {
      withTimezone: true,
    }),
    recordingMode: text("recording_mode", { enum: recordingModeEnum })
      .notNull()
      .default("upload"),
    language: text("language").notNull().default("nl"), // ISO 639-1 language code
    status: text("status", { enum: recordingArchiveStatusEnum })
      .notNull()
      .default("active"),
    workflowStatus: text("workflow_status", { enum: workflowStatusEnum })
      .notNull()
      .default("idle"),
    workflowError: text("workflow_error"),
    workflowRetryCount: integer("workflow_retry_count").notNull().default(0),
    lastReprocessedAt: timestamp("last_reprocessed_at", { withTimezone: true }),
    reprocessingTriggeredById: text("reprocessing_triggered_by_id"), // Kinde user ID
    organizationId: text("organization_id").notNull(), // Kinde organization code
    createdById: text("created_by_id").notNull(), // Kinde user ID
    externalRecordingId: text("external_recording_id"), // External recording ID (e.g., Recall.ai recording.id)
    // Consent tracking fields
    consentGiven: boolean("consent_given").notNull().default(false),
    consentGivenBy: text("consent_given_by"), // Kinde user ID
    consentGivenAt: timestamp("consent_given_at", { withTimezone: true }),
    consentRevokedAt: timestamp("consent_revoked_at", { withTimezone: true }),
    // Encryption fields
    isEncrypted: boolean("is_encrypted").notNull().default(false),
    encryptionMetadata: text("encryption_metadata"), // JSON metadata
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Ensure unique external recording ID per organization
    uniqueExternalRecordingIdPerOrg: unique().on(
      table.organizationId,
      table.externalRecordingId
    ),
  })
);

export type Recording = typeof recordings.$inferSelect;
export type NewRecording = typeof recordings.$inferInsert;

