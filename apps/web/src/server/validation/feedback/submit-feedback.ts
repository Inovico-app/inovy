import { z } from "zod";

export const submitFeedbackSchema = z.object({
  recordingId: z.string().uuid(),
  type: z.enum(["summary", "transcription", "general"]),
  rating: z.enum(["positive", "negative"]),
  comment: z.string().max(500).optional(),
});
