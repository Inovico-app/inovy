import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { meetings } from "./meetings";

export const meetingShareTokens = pgTable(
  "meeting_share_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    createdById: text("created_by_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    requiresAuth: boolean("requires_auth").notNull().default(true),
    requiresOrgMembership: boolean("requires_org_membership")
      .notNull()
      .default(true),
    accessedAt: timestamp("accessed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    meetingIdx: index("meeting_share_tokens_meeting_id_idx").on(
      table.meetingId
    ),
    tokenHashIdx: index("meeting_share_tokens_token_hash_idx").on(
      table.tokenHash
    ),
  })
);

export type MeetingShareToken = typeof meetingShareTokens.$inferSelect;
export type NewMeetingShareToken = typeof meetingShareTokens.$inferInsert;
