import { z } from "zod";

/**
 * Schema for updating recording metadata
 */
export const updateRecordingMetadataSchema = z.object({
  id: z.string().uuid("Invalid recording ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .nullable(),
  recordingDate: z.coerce.date(),
});

export type UpdateRecordingMetadataInput = z.infer<
  typeof updateRecordingMetadataSchema
>;

