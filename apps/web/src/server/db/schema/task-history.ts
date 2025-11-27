import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

/**
 * Task History Table
 * Tracks all modifications to tasks for audit trail purposes
 */
export const taskHistory = pgTable("task_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => tasks.id, { onDelete: "cascade" }),
  field: text("field").notNull(), // Changed field name (e.g., "title", "priority")
  oldValue: jsonb("old_value"), // Previous value (stored as JSON for flexibility)
  newValue: jsonb("new_value"), // New value (stored as JSON for flexibility)
  changedById: text("changed_by_id").notNull(), // Better Auth user ID who made the change
  changedAt: timestamp("changed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TaskHistory = typeof taskHistory.$inferSelect;
export type NewTaskHistory = typeof taskHistory.$inferInsert;

