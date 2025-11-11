import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectTemplates = pgTable(
  "project_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),

    instructions: text("instructions").notNull(),
    createdById: text("created_by_id").notNull(), // Kinde user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    projectIdIdx: index("project_templates_project_id_idx").on(table.projectId),
    organizationIdIdx: index("project_templates_organization_id_idx").on(
      table.organizationId
    ),
  })
);

export type ProjectTemplate = typeof projectTemplates.$inferSelect;
export type NewProjectTemplate = typeof projectTemplates.$inferInsert;

