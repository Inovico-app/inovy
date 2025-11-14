import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

export const redactionTypeEnum = ["pii", "phi", "custom"] as const;
export type RedactionType = (typeof redactionTypeEnum)[number];

export const detectedByEnum = ["automatic", "manual"] as const;
export type DetectedBy = (typeof detectedByEnum)[number];

export const redactions = pgTable("redactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  redactionType: text("redaction_type", { enum: redactionTypeEnum })
    .notNull()
    .default("pii"),
  originalText: text("original_text").notNull(),
  redactedText: text("redacted_text").notNull().default("[REDACTED]"),
  startTime: integer("start_time"), // seconds, for audio redaction
  endTime: integer("end_time"), // seconds
  startIndex: integer("start_index"), // character index in transcript
  endIndex: integer("end_index"), // character index in transcript
  detectedBy: text("detected_by", { enum: detectedByEnum })
    .notNull()
    .default("automatic"),
  redactedBy: text("redacted_by").notNull(), // Kinde user ID
  redactedAt: timestamp("redacted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Redaction = typeof redactions.$inferSelect;
export type NewRedaction = typeof redactions.$inferInsert;

