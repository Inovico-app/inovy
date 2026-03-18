import { isValidMeetingUrl } from "@/lib/meeting-url";
import { z } from "zod";

export const updateBotSessionMeetingUrlSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  meetingUrl: z
    .string()
    .min(1, "Meeting URL is required")
    .refine(isValidMeetingUrl, {
      message:
        "Meeting URL must be a valid Google Meet or Microsoft Teams link",
    }),
});

export type UpdateBotSessionMeetingUrlInput = z.infer<
  typeof updateBotSessionMeetingUrlSchema
>;
