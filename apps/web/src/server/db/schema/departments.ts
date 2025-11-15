import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(), // Kinde organization code
    name: text("name").notNull(),
    description: text("description"),
    parentDepartmentId: uuid("parent_department_id"), // Nullable for top-level departments
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("departments_organization_id_idx").on(
      table.organizationId
    ),
    parentDepartmentIdIdx: index("departments_parent_department_id_idx").on(
      table.parentDepartmentId
    ),
  })
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

