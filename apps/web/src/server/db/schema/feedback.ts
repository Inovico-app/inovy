import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";

/**
 * Feedback Table
 * Stores user feedback (thumbs up/down) on recording outputs
 * One feedback per user per type per recording
 */
export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'summary' | 'transcription' | 'general'
    rating: text("rating").notNull(), // 'positive' | 'negative'
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uniqueUserRecordingType: unique().on(
      table.userId,
      table.recordingId,
      table.type,
    ),
    orgIdIdx: index("feedback_org_id_idx").on(table.organizationId),
    recordingIdIdx: index("feedback_recording_id_idx").on(table.recordingId),
  }),
);

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
