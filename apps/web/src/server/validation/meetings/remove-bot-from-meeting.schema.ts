import { z } from "zod";

/**
 * Schema for removing a bot from a meeting
 * Accepts either calendarEventId (for meetings UI) or sessionId (for bot sessions page)
 */
export const removeBotFromMeetingSchema = z
  .object({
    calendarEventId: z.string().min(1).optional(),
    sessionId: z.string().uuid("Session ID must be a valid UUID").optional(),
  })
  .refine((data) => data.calendarEventId || data.sessionId, {
    message: "Either calendarEventId or sessionId must be provided",
  });

export type RemoveBotFromMeetingInput = z.infer<
  typeof removeBotFromMeetingSchema
>;

