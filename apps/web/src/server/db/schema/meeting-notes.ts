import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const meetingNoteTypeEnum = [
  "pre_meeting",
  "during_meeting",
  "post_meeting",
] as const;

export type MeetingNoteType = (typeof meetingNoteTypeEnum)[number];

export const meetingNotes = pgTable(
  "meeting_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").notNull(),
    content: text("content").notNull(),
    type: text("type", { enum: meetingNoteTypeEnum }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_notes_meeting_id_idx").on(table.meetingId),
  })
);

export type MeetingNote = typeof meetingNotes.$inferSelect;
export type NewMeetingNote = typeof meetingNotes.$inferInsert;
