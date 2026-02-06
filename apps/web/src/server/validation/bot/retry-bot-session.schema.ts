import { z } from "zod";

/**
 * Schema for retrying a failed bot session
 */
export const retryBotSessionSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
});

export type RetryBotSessionInput = z.infer<typeof retryBotSessionSchema>;

