import { z } from "zod";

/**
 * Schema for canceling a bot session
 */
export const cancelBotSessionSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
});

export type CancelBotSessionInput = z.infer<typeof cancelBotSessionSchema>;

