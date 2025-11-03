import { pgTable, text, timestamp, uuid, unique, index } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";

/**
 * Task Tags Table
 * Stores reusable tags that can be assigned to tasks
 */
export const taskTags = pgTable(
  "task_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#3b82f6"), // Default to blue
    organizationId: text("organization_id").notNull(), // Kinde organization code
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Ensure unique tag names per organization
    uniqueNamePerOrg: unique().on(table.name, table.organizationId),
    // Index for efficient querying by organization
    orgIdIdx: index("task_tags_org_id_idx").on(table.organizationId),
  })
);

/**
 * Task Tag Assignments Table
 * Junction table for many-to-many relationship between tasks and tags
 */
export const taskTagAssignments = pgTable(
  "task_tag_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => taskTags.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Ensure a tag can only be assigned once to a task
    uniqueTaskTag: unique().on(table.taskId, table.tagId),
    // Index for efficient querying by task
    taskIdIdx: index("task_tag_assignments_task_id_idx").on(table.taskId),
    // Index for efficient querying by tag
    tagIdIdx: index("task_tag_assignments_tag_id_idx").on(table.tagId),
  })
);

export type TaskTag = typeof taskTags.$inferSelect;
export type NewTaskTag = typeof taskTags.$inferInsert;
export type TaskTagAssignment = typeof taskTagAssignments.$inferSelect;
export type NewTaskTagAssignment = typeof taskTagAssignments.$inferInsert;

