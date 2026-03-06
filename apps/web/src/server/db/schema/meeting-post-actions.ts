import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const postActionTypeEnum = [
  "send_summary_email",
  "create_tasks",
  "share_recording",
  "generate_followup_agenda",
  "push_external",
] as const;

export type PostActionType = (typeof postActionTypeEnum)[number];

export const postActionStatusEnum = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
] as const;

export type PostActionStatus = (typeof postActionStatusEnum)[number];

export const meetingPostActions = pgTable(
  "meeting_post_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    type: text("type", { enum: postActionTypeEnum }).notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    status: text("status", { enum: postActionStatusEnum })
      .notNull()
      .default("pending"),
    result: jsonb("result").$type<Record<string, unknown>>(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_post_actions_meeting_id_idx").on(
      table.meetingId
    ),
    statusIdx: index("meeting_post_actions_status_idx").on(
      table.meetingId,
      table.status
    ),
  })
);

export type MeetingPostAction = typeof meetingPostActions.$inferSelect;
export type NewMeetingPostAction = typeof meetingPostActions.$inferInsert;
