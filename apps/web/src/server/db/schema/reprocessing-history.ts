import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

export const reprocessingStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type ReprocessingStatus = (typeof reprocessingStatusEnum)[number];

export const reprocessingHistory = pgTable("reprocessing_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  recordingId: uuid("recording_id")
    .notNull()
    .references(() => recordings.id, { onDelete: "cascade" }),
  triggeredById: text("triggered_by_id").notNull(), // Better Auth user ID
  status: text("status", { enum: reprocessingStatusEnum })
    .notNull()
    .default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  backupData: jsonb("backup_data").$type<{
    transcription?: {
      text: string;
      utterances?: unknown[];
      insightId: string;
    };
    summary?: {
      content: Record<string, unknown>;
      insightId: string;
    };
    tasks?: Array<{
      id: string;
      title: string;
      description: string | null;
      priority: string;
      status: string;
      assigneeId: string | null;
      assigneeName: string | null;
      dueDate: Date | null;
      confidenceScore: number | null;
      meetingTimestamp: number | null;
    }>;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ReprocessingHistory = typeof reprocessingHistory.$inferSelect;
export type NewReprocessingHistory = typeof reprocessingHistory.$inferInsert;

