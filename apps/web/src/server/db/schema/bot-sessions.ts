import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { recordings } from "./recordings";

export const botSessions = pgTable("bot_sessions", {
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
  organizationId: text("organization_id").notNull(), // Kinde organization code
  userId: text("user_id").notNull(), // Kinde user ID
  recallBotId: text("recall_bot_id").notNull(), // Recall.ai bot session ID
  recallStatus: text("recall_status").notNull(), // Status from Recall.ai
  meetingUrl: text("meeting_url").notNull(),
  meetingTitle: text("meeting_title"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BotSession = typeof botSessions.$inferSelect;
export type NewBotSession = typeof botSessions.$inferInsert;

