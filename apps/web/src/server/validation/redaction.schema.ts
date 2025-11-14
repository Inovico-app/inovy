import { z } from "zod";

export const redactionTypeSchema = z.enum(["pii", "phi", "custom"]);
export const detectedBySchema = z.enum(["automatic", "manual"]);

export const createRedactionSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  redactionType: redactionTypeSchema,
  originalText: z.string().min(1, "Original text is required"),
  redactedText: z.string().optional(),
  startTime: z.number().nonnegative().optional(),
  endTime: z.number().nonnegative().optional(),
  startIndex: z.number().nonnegative().optional(),
  endIndex: z.number().nonnegative().optional(),
  detectedBy: detectedBySchema.optional(),
});

export const bulkRedactionSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  redactions: z.array(
    z.object({
      redactionType: redactionTypeSchema,
      originalText: z.string().min(1, "Original text is required"),
      redactedText: z.string().optional(),
      startTime: z.number().nonnegative().optional(),
      endTime: z.number().nonnegative().optional(),
      startIndex: z.number().nonnegative().optional(),
      endIndex: z.number().nonnegative().optional(),
      detectedBy: detectedBySchema.optional(),
    })
  ),
});

export const detectPIISchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  minConfidence: z.number().min(0).max(1).optional().default(0.5),
});

export const applyAutomaticRedactionsSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID"),
  minConfidence: z.number().min(0).max(1).optional().default(0.5),
});

