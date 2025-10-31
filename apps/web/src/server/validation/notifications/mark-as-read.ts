import { z } from "zod";

/**
 * Validation schema for marking a notification as read
 */
export const markAsReadSchema = z.object({
  notificationId: z.string().uuid("Invalid notification ID"),
});

export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;

