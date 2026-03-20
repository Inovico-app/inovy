import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const botSeriesSubscriptions = pgTable(
  "bot_series_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    organizationId: text("organization_id").notNull(),
    recurringSeriesId: text("recurring_series_id").notNull(),
    calendarProvider: text("calendar_provider", {
      enum: ["google", "microsoft"],
    }).notNull(),
    calendarId: text("calendar_id").notNull(),
    seriesTitle: text("series_title"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userOrgSeriesUnique: unique("bot_series_sub_user_org_series_unique").on(
      table.userId,
      table.organizationId,
      table.recurringSeriesId,
    ),
    userOrgActiveIdx: index("bot_series_sub_user_org_active_idx").on(
      table.userId,
      table.organizationId,
      table.active,
    ),
    orgSeriesIdx: index("bot_series_sub_org_series_idx").on(
      table.organizationId,
      table.recurringSeriesId,
    ),
  }),
);

export type BotSeriesSubscription = typeof botSeriesSubscriptions.$inferSelect;
export type NewBotSeriesSubscription =
  typeof botSeriesSubscriptions.$inferInsert;
