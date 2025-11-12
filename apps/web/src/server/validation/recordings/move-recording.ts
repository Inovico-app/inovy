import { z } from "zod";

/**
 * Validation schema for moving a recording to another project
 */
export const moveRecordingSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  targetProjectId: z.string().uuid("Invalid target project ID"),
});

export type MoveRecordingInput = z.infer<typeof moveRecordingSchema>;

