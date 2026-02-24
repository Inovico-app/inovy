import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

interface TranscriptionEdit {
  start: number;
  end: number;
  oldText: string;
  newText: string;
}

/**
 * Transcription History Table
 * Tracks all modifications to transcriptions for audit trail and version history
 * Stores both full snapshots and individual edits
 */
export const transcriptionHistory = pgTable("transcription_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  content: text("content").notNull(), // Full transcription content snapshot
  editedSections: jsonb("edited_sections").$type<TranscriptionEdit[]>(), // Track specific edited sections
  editedById: text("edited_by_id").notNull(), // Better Auth user ID who made the edit
  editedAt: timestamp("edited_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  versionNumber: integer("version_number").notNull(), // Sequential version number
  changeDescription: text("change_description"), // Optional description of changes
  // Encryption fields (SSD-4.2.02: HIGHLY_CONFIDENTIAL data)
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  encryptionMetadata: text("encryption_metadata"),
});

export type TranscriptionHistory = typeof transcriptionHistory.$inferSelect;
export type NewTranscriptionHistory = typeof transcriptionHistory.$inferInsert;

