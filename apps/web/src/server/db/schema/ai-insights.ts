import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  real,
  integer,
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AIInsight = typeof aiInsights.$inferSelect;
export type NewAIInsight = typeof aiInsights.$inferInsert;

