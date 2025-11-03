import { z } from "zod";
import { taskPriorityEnum, taskStatusEnum } from "../../db/schema/tasks";

/**
 * Validation schema for updating task metadata
 * All fields except taskId are optional to allow partial updates
 */
export const updateTaskMetadataSchema = z.object({
  taskId: z.string().uuid("Invalid task ID format"),
  title: z
    .string()
    .min(1, "Title must not be empty")
    .max(500, "Title is too long")
    .optional(),
  description: z
    .string()
    .max(2000, "Description is too long")
    .nullable()
    .optional(),
  priority: z.enum(taskPriorityEnum).optional(),
  status: z.enum(taskStatusEnum).optional(),
  assigneeId: z.string().nullable().optional(),
  assigneeName: z
    .string()
    .max(200, "Assignee name is too long")
    .nullable()
    .optional(),
  dueDate: z.coerce.date().nullable().optional(),
  tagIds: z.array(z.string().uuid("Invalid tag ID format")).optional(),
});

export type UpdateTaskMetadataInput = z.infer<typeof updateTaskMetadataSchema>;

