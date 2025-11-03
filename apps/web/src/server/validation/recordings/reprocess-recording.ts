import { z } from "zod";

/**
 * Validation schema for reprocessing a recording
 */
export const reprocessRecordingSchema = z.object({
  recordingId: z.string().uuid("Recording ID must be a valid UUID"),
});

export type ReprocessRecordingInput = z.infer<typeof reprocessRecordingSchema>;

