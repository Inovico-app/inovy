import { taskPriorityEnum, taskStatusEnum } from "@/server/db/schema/tasks";
import { z } from "zod";

/**
 * Schema for filtering tasks
 */
export const filterTasksSchema = z.object({
  priorities: z.array(z.enum(taskPriorityEnum)).optional(),
  statuses: z.array(z.enum(taskStatusEnum)).optional(),
  projectIds: z.array(z.string().uuid()).optional(),
  search: z.string().optional(),
});

export type FilterTasksInput = z.infer<typeof filterTasksSchema>;

