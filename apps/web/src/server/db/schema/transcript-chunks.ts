import {
  boolean,
  index,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { botSessions } from "./bot-sessions";
import { recordings } from "./recordings";

export const transcriptChunks = pgTable(
  "transcript_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    botSessionId: uuid("bot_session_id")
      .notNull()
      .references(() => botSessions.id, { onDelete: "cascade" }),
    recordingId: uuid("recording_id").references(() => recordings.id, {
      onDelete: "set null",
    }),
    speakerId: text("speaker_id"),
    text: text("text").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    confidence: real("confidence"),
    isFinal: boolean("is_final").notNull().default(false),
    language: text("language"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    recordingTimeIdx: index("transcript_chunks_recording_time_idx").on(
      table.recordingId,
      table.startTime,
    ),
    sessionIdx: index("transcript_chunks_session_idx").on(table.botSessionId),
  }),
);

export type TranscriptChunk = typeof transcriptChunks.$inferSelect;
export type NewTranscriptChunk = typeof transcriptChunks.$inferInsert;
