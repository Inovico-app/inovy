import { z } from "zod";

export const archiveRecordingSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
});

export type ArchiveRecordingInput = z.infer<typeof archiveRecordingSchema>;

