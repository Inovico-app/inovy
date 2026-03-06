import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export interface AgendaTemplateItem {
  title: string;
  description: string | null;
  sortOrder: number;
}

export const meetingAgendaTemplates = pgTable(
  "meeting_agenda_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    createdById: text("created_by_id"),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    items: jsonb("items").$type<AgendaTemplateItem[]>().notNull().default([]),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("meeting_agenda_templates_org_idx").on(table.organizationId),
    categoryIdx: index("meeting_agenda_templates_category_idx").on(
      table.organizationId,
      table.category
    ),
  })
);

export type MeetingAgendaTemplate =
  typeof meetingAgendaTemplates.$inferSelect;
export type NewMeetingAgendaTemplate =
  typeof meetingAgendaTemplates.$inferInsert;
