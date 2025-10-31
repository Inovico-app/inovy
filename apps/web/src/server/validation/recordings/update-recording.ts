import { z } from "zod";

export const updateRecordingSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  title: z
    .string()
    .min(1, "Recording title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .nullable(),
  recordingDate: z.coerce.date({
    required_error: "Recording date is required",
    invalid_type_error: "Invalid date format",
  }),
});

export type UpdateRecordingInput = z.infer<typeof updateRecordingSchema>;

