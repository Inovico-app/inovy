import { z } from "zod";

/**
 * Schema for approving a bot session requiring consent
 */
export const approveBotJoinSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
});

export type ApproveBotJoinInput = z.infer<typeof approveBotJoinSchema>;
