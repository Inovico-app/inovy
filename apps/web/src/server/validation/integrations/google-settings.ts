import { z } from "zod";
import { taskPriorityEnum } from "../../db/schema/tasks";

/**
 * Validation schemas for Google integration settings
 */

export const updateGoogleSettingsSchema = z.object({
  projectId: z.string().uuid().optional(), // Optional: project-level override
  autoCalendarEnabled: z.boolean(),
  autoEmailEnabled: z.boolean(),
  defaultEventDuration: z.number().min(15).max(480), // 15 min to 8 hours
  taskPriorityFilter: z.array(z.enum(taskPriorityEnum)).optional(), // null = all priorities
});

export type UpdateGoogleSettingsInput = z.infer<typeof updateGoogleSettingsSchema>;

export const getGoogleSettingsSchema = z.object({
  projectId: z.string().uuid().optional(),
});

export type GetGoogleSettingsInput = z.infer<typeof getGoogleSettingsSchema>;

