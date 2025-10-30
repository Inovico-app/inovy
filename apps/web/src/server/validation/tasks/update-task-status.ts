import { z } from "zod";
import { taskStatusEnum } from "@/server/db/schema/tasks";

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid("Invalid task ID"),
  status: z.enum(taskStatusEnum),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

