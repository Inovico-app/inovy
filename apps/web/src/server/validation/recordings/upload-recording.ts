import { z } from "zod";

/**
 * Allowed audio/video MIME types for recordings
 */
export const ALLOWED_MIME_TYPES = [
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a
  "audio/wav", // .wav
  "audio/x-wav", // .wav (alternative)
  "video/mp4", // .mp4
  "audio/x-m4a", // .m4a (alternative)
] as const;

/**
 * Maximum file size: 100MB
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

/**
 * Schema for uploading a recording
 */
export const uploadRecordingSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  recordingDate: z.coerce.date(),
  // File validation will be done separately since we can't validate File objects in Zod schema
});

export type UploadRecordingInput = z.infer<typeof uploadRecordingSchema>;

