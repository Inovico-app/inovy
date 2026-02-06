import { z } from "zod";

/**
 * Schema for denying a bot session requiring consent
 */
export const denyBotJoinSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
});

export type DenyBotJoinInput = z.infer<typeof denyBotJoinSchema>;
