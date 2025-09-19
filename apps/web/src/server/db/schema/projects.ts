import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { users } from "./users";

export const projectStatusEnum = ["active", "archived", "completed"] as const;
export type ProjectStatus = (typeof projectStatusEnum)[number];

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: projectStatusEnum })
    .notNull()
    .default("active"),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

