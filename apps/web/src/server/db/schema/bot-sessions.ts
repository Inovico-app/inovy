import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { recordings } from "./recordings";

export const botStatusEnum = [
  "scheduled",
  "joining",
  "active",
  "leaving",
  "completed",
  "failed",
  "pending_consent",
] as const;

export type BotStatus = (typeof botStatusEnum)[number];

export const botSessions = pgTable(
  "bot_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordingId: uuid("recording_id").references(() => recordings.id, {
      onDelete: "set null",
      onUpdate: "no action",
    }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
        onUpdate: "no action",
      }),
    organizationId: text("organization_id").notNull(), // Better Auth organization ID
    userId: text("user_id").notNull(), // Better Auth user ID
    recallBotId: text("recall_bot_id").notNull(), // Recall.ai bot session ID
    recallStatus: text("recall_status").notNull(), // Status from Recall.ai
    meetingUrl: text("meeting_url").notNull(),
    meetingTitle: text("meeting_title"),
    calendarEventId: text("calendar_event_id"), // Google Calendar event ID for deduplication
    botStatus: text("bot_status", { enum: botStatusEnum })
      .notNull()
      .default("scheduled"), // Lifecycle status
    joinedAt: timestamp("joined_at", { withTimezone: true }), // When bot joined meeting
    leftAt: timestamp("left_at", { withTimezone: true }), // When bot left meeting
    error: text("error"), // Error message for failed sessions
    retryCount: integer("retry_count").notNull().default(0), // Number of retry attempts
    meetingParticipants: text("meeting_participants").array(), // Array of participant emails/names
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    calendarEventIdOrgIdx: index("bot_sessions_calendar_event_id_org_idx").on(
      table.calendarEventId,
      table.organizationId
    ),
    botStatusOrgIdx: index("bot_sessions_bot_status_org_idx").on(
      table.botStatus,
      table.organizationId
    ),
    userIdOrgIdx: index("bot_sessions_user_id_org_idx").on(
      table.userId,
      table.organizationId
    ),
  })
);

export type BotSession = typeof botSessions.$inferSelect;
export type NewBotSession = typeof botSessions.$inferInsert;
