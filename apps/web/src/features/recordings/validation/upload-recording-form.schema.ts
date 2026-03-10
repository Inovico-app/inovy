import { z } from "zod";

export const uploadRecordingFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional().or(z.literal("")),
  recordingDate: z.string().min(1, "Recording date is required"),
});

export type UploadRecordingFormValues = z.infer<typeof uploadRecordingFormSchema>;
