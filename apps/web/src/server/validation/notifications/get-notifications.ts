import { z } from "zod";
import { notificationTypeEnum } from "../../db/schema/notifications";

/**
 * Validation schema for getting notifications with filters
 */
export const getNotificationsSchema = z.object({
  unreadOnly: z.boolean().optional(),
  type: z.enum(notificationTypeEnum).optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetNotificationsInput = z.infer<typeof getNotificationsSchema>;

