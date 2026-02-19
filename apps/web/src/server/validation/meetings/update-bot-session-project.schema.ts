import { z } from "zod";

export const updateBotSessionProjectSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  projectId: z.string().uuid("Project ID must be a valid UUID"),
});

export type UpdateBotSessionProjectInput = z.infer<
  typeof updateBotSessionProjectSchema
>;
