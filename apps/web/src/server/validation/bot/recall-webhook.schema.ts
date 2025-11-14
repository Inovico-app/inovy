import { z } from "zod";

/**
 * Recall.ai Webhook Validation Schemas
 * Type-safe input validation for Recall.ai webhook payloads
 */

/**
 * Bot status change event schema
 */
export const botStatusChangeEventSchema = z.object({
  event: z.literal("bot.status_change"),
  bot: z.object({
    id: z.string(),
    status: z.string(),
    meeting_url: z.string().url().optional(),
  }),
  custom_metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * Bot recording ready event schema
 */
export const botRecordingReadyEventSchema = z.object({
  event: z.literal("bot.recording_ready"),
  bot: z.object({
    id: z.string(),
    status: z.string(),
    meeting_url: z.string().url().optional(),
  }),
  recording: z.object({
    id: z.string(),
    url: z.string().url(),
    duration: z.number().optional(),
    format: z.string().optional(),
  }),
  meeting: z
    .object({
      title: z.string().optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
    })
    .optional(),
  custom_metadata: z.record(z.string(), z.string()).optional(),
});

/**
 * Union type for all webhook events
 */
export const recallWebhookEventSchema = z.union([
  botStatusChangeEventSchema,
  botRecordingReadyEventSchema,
]);

export type BotStatusChangeEvent = z.infer<typeof botStatusChangeEventSchema>;
export type BotRecordingReadyEvent = z.infer<
  typeof botRecordingReadyEventSchema
>;
export type RecallWebhookEvent = z.infer<typeof recallWebhookEventSchema>;

