import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const agendaItemStatusEnum = [
  "pending",
  "in_progress",
  "covered",
  "skipped",
] as const;

export type AgendaItemStatus = (typeof agendaItemStatusEnum)[number];

export const meetingAgendaItems = pgTable(
  "meeting_agenda_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: agendaItemStatusEnum })
      .notNull()
      .default("pending"),
    coveredAt: timestamp("covered_at", { withTimezone: true }),
    aiSummary: text("ai_summary"),
    aiKeyPoints: jsonb("ai_key_points").$type<string[]>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_agenda_items_meeting_id_idx").on(
      table.meetingId
    ),
    sortIdx: index("meeting_agenda_items_sort_idx").on(
      table.meetingId,
      table.sortOrder
    ),
  })
);

export type MeetingAgendaItem = typeof meetingAgendaItems.$inferSelect;
export type NewMeetingAgendaItem = typeof meetingAgendaItems.$inferInsert;
