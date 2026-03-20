import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { teams } from "./auth";

export const projectStatusEnum = ["active", "archived", "completed"] as const;
export type ProjectStatus = (typeof projectStatusEnum)[number];

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", { enum: projectStatusEnum })
      .notNull()
      .default("active"),
    organizationId: text("organization_id").notNull(),
    teamId: text("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgTeamIdx: index("projects_organization_team_idx").on(
      table.organizationId,
      table.teamId,
    ),
  }),
);
