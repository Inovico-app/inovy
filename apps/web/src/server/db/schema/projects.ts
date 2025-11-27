import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const projectStatusEnum = ["active", "archived", "completed"] as const;
export type ProjectStatus = (typeof projectStatusEnum)[number];

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: projectStatusEnum })
    .notNull()
    .default("active"),
  organizationId: text("organization_id").notNull(), // Better Auth organization ID
  createdById: text("created_by_id").notNull(), // Better Auth user ID
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

