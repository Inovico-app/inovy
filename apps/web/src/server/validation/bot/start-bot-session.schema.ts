import { z } from "zod";

/**
 * Start Bot Session Validation Schema
 * Type-safe input validation for starting Recall.ai bot sessions
 */

export const startBotSessionSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID"),
  meetingUrl: z
    .string()
    .url("Meeting URL must be a valid URL")
    .min(1, "Meeting URL is required"),
  meetingTitle: z.string().max(500, "Meeting title is too long").optional(),
});

export type StartBotSessionInput = z.infer<typeof startBotSessionSchema>;

