import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Bot Settings Table
 * User preferences for bot behavior and configuration
 * One settings record per user per organization
 */
export const botSettings = pgTable(
  "bot_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Better Auth user ID
    organizationId: text("organization_id").notNull(), // Better Auth organization ID
    botEnabled: boolean("bot_enabled").notNull().default(false), // Master toggle
    autoJoinEnabled: boolean("auto_join_enabled").notNull().default(false), // Auto-join meetings
    requirePerMeetingConsent: boolean("require_per_meeting_consent")
      .notNull()
      .default(true), // Require consent per meeting
    botDisplayName: text("bot_display_name")
      .notNull()
      .default("Inovy Recording Bot"), // Bot name in meetings
    botJoinMessage: text("bot_join_message"), // Custom join message
    calendarIds: text("calendar_ids").array(), // Specific calendars to monitor (null = all)
    inactivityTimeoutMinutes: integer("inactivity_timeout_minutes")
      .notNull()
      .default(60), // Auto-leave after inactivity (minutes)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdOrgUnique: unique("bot_settings_user_id_org_unique").on(
      table.userId,
      table.organizationId
    ),
    userIdOrgIdx: index("bot_settings_user_id_org_idx").on(
      table.userId,
      table.organizationId
    ),
    botEnabledOrgIdx: index("bot_settings_bot_enabled_org_idx").on(
      table.botEnabled,
      table.organizationId
    ),
  })
);

export type BotSettings = typeof botSettings.$inferSelect;
export type NewBotSettings = typeof botSettings.$inferInsert;

