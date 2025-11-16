import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { departments } from "./departments";

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "set null",
    }), // Nullable - teams can exist without departments
    organizationId: text("organization_id").notNull(), // Kinde organization code
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index("teams_organization_id_idx").on(
      table.organizationId
    ),
    departmentIdIdx: index("teams_department_id_idx").on(table.departmentId),
  })
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

