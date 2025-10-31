import { z } from "zod";

export const deleteRecordingSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  confirmationText: z.string().min(1, "Confirmation text is required"),
});

export type DeleteRecordingInput = z.infer<typeof deleteRecordingSchema>;

