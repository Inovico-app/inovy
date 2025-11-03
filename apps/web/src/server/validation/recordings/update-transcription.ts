import { z } from "zod";

/**
 * Validation schema for updating transcription content
 */
export const updateTranscriptionSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  content: z.string().min(1, "Transcription content cannot be empty"),
  changeDescription: z.string().optional(),
});

export type UpdateTranscriptionInput = z.infer<typeof updateTranscriptionSchema>;

