import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const meetingStatusEnum = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type MeetingStatus = (typeof meetingStatusEnum)[number];

export interface MeetingParticipant {
  email: string;
  name: string | null;
  role: string | null;
}

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id").notNull(),
    calendarEventId: text("calendar_event_id"),
    externalCalendarId: text("external_calendar_id"),
    title: text("title").notNull(),
    description: text("description"),
    scheduledStartAt: timestamp("scheduled_start_at", {
      withTimezone: true,
    }).notNull(),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
    actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
    status: text("status", { enum: meetingStatusEnum })
      .notNull()
      .default("scheduled"),
    meetingUrl: text("meeting_url"),
    participants: jsonb("participants")
      .$type<MeetingParticipant[]>()
      .default([]),
    lastAgendaCheckAt: timestamp("last_agenda_check_at", {
      withTimezone: true,
    }),
    lastTranscriptLength: integer("last_transcript_length")
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("meetings_organization_id_idx").on(table.organizationId),
    calendarEventIdx: index("meetings_calendar_event_id_idx").on(
      table.calendarEventId
    ),
    statusIdx: index("meetings_status_idx").on(
      table.organizationId,
      table.status
    ),
    scheduledIdx: index("meetings_scheduled_start_idx").on(
      table.organizationId,
      table.scheduledStartAt
    ),
  })
);

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
