import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  real,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

export const insightTypeEnum = [
  "transcription",
  "summary",
  "action_items",
  "decisions",
  "risks",
  "next_steps",
] as const;
export type InsightType = (typeof insightTypeEnum)[number];

export const insightProcessingStatusEnum = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type InsightProcessingStatus =
  (typeof insightProcessingStatusEnum)[number];

interface Speaker {
  id: number;
  name?: string;
  utterances: number;
}

interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id),
  insightType: text("insight_type", { enum: insightTypeEnum }).notNull(),
  content: jsonb("content").notNull().$type<Record<string, unknown>>(),
  confidenceScore: real("confidence_score"),
  processingStatus: text("processing_status", {
    enum: insightProcessingStatusEnum,
  })
    .notNull()
    .default("pending"),
  speakersDetected: integer("speakers_detected"),
  utterances: jsonb("utterances").$type<Utterance[]>(),
  errorMessage: text("error_message"),
  isManuallyEdited: boolean("is_manually_edited").notNull().default(false), // Track if insight has been manually edited
  lastEditedById: text("last_edited_by_id"), // Kinde user ID who last edited
  lastEditedAt: timestamp("last_edited_at", { withTimezone: true }), // Last manual edit timestamp
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AIInsight = typeof aiInsights.$inferSelect;
export type NewAIInsight = typeof aiInsights.$inferInsert;

