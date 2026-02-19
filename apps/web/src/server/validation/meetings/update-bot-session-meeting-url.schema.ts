import { z } from "zod";

function isValidGoogleMeetUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname === "meet.google.com";
  } catch {
    return false;
  }
}

export const updateBotSessionMeetingUrlSchema = z.object({
  sessionId: z.string().uuid("Session ID must be a valid UUID"),
  meetingUrl: z
    .string()
    .min(1, "Meeting URL is required")
    .refine(isValidGoogleMeetUrl, {
      message: "Meeting URL must be a valid Google Meet link (meet.google.com)",
    }),
});

export type UpdateBotSessionMeetingUrlInput = z.infer<
  typeof updateBotSessionMeetingUrlSchema
>;

