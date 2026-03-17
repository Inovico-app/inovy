import { z } from "zod";
import { taskPriorityEnum } from "../../db/schema/tasks";

/**
 * Validation schemas for Microsoft integration settings
 */

export const updateMicrosoftSettingsSchema = z.object({
  projectId: z.string().uuid().optional(), // Optional: project-level override
  autoCalendarEnabled: z.boolean(),
  autoEmailEnabled: z.boolean(),
  defaultEventDuration: z.number().min(15).max(480), // 15 min to 8 hours
  taskPriorityFilter: z.array(z.enum(taskPriorityEnum)).optional(), // null = all priorities
});

export type UpdateMicrosoftSettingsInput = z.infer<
  typeof updateMicrosoftSettingsSchema
>;

export const getMicrosoftSettingsSchema = z.object({
  projectId: z.string().uuid().optional(),
});

export type GetMicrosoftSettingsInput = z.infer<
  typeof getMicrosoftSettingsSchema
>;
