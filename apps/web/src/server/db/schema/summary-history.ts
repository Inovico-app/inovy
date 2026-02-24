import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

/**
 * Summary History Table
 * Tracks all modifications to AI-generated summaries for audit trail and version history
 * Stores full snapshots of summary content
 */
export const summaryHistory = pgTable("summary_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull().$type<Record<string, unknown>>(), // Full summary content snapshot
  editedById: text("edited_by_id").notNull(), // Better Auth user ID who made the edit
  editedAt: timestamp("edited_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  versionNumber: integer("version_number").notNull(), // Sequential version number
  changeDescription: text("change_description"), // Optional description of changes
  // Encryption fields (SSD-4.2.02: CONFIDENTIAL data)
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  encryptionMetadata: text("encryption_metadata"),
});

export type SummaryHistory = typeof summaryHistory.$inferSelect;
export type NewSummaryHistory = typeof summaryHistory.$inferInsert;

