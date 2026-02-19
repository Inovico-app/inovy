import { z } from "zod";

/**
 * Recall.ai Webhook Validation Schemas
 * Supports both Svix format (current) and legacy flat format
 * Per https://docs.recall.ai/docs/bot-status-change-events and https://docs.recall.ai/docs/recording-webhooks
 */

const metadataSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional();

const svixDataSchema = z.object({
  code: z.string().optional(),
  sub_code: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});

const svixBotSchema = z.object({
  id: z.string(),
  metadata: metadataSchema,
});

const svixRecordingSchema = z.object({
  id: z.string(),
  metadata: metadataSchema,
});

/**
 * Svix-format bot status change events
 * Events: bot.joining_call, bot.in_waiting_room, bot.in_call_not_recording,
 * bot.recording_permission_allowed, bot.recording_permission_denied,
 * bot.in_call_recording, bot.call_ended, bot.done, bot.fatal,
 * bot.breakout_room_entered, bot.breakout_room_left, bot.breakout_room_opened, bot.breakout_room_closed
 */
export const svixBotStatusEventSchema = z.object({
  event: z.string().refine((e) => e.startsWith("bot.")),
  data: z.object({
    data: svixDataSchema.optional(),
    bot: svixBotSchema,
  }),
});

/**
 * Svix-format recording events
 * Events: recording.processing, recording.done, recording.failed, recording.deleted
 */
export const svixRecordingEventSchema = z.object({
  event: z.string().refine((e) => e.startsWith("recording.")),
  data: z.object({
    data: svixDataSchema.optional(),
    recording: svixRecordingSchema,
    bot: svixBotSchema,
  }),
});

/**
 * Legacy bot status change event (if Recall still sends it)
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
 * Legacy bot recording ready event (if Recall still sends it)
 * Has recording.url in payload
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
 * Union for all webhook event formats
 * Tries Svix first (event in data.bot), then legacy
 */
export const recallWebhookEventSchema = z.union([
  svixBotStatusEventSchema,
  svixRecordingEventSchema,
  botStatusChangeEventSchema,
  botRecordingReadyEventSchema,
]);

export type SvixBotStatusEvent = z.infer<typeof svixBotStatusEventSchema>;
export type SvixRecordingEvent = z.infer<typeof svixRecordingEventSchema>;
export type BotStatusChangeEvent = z.infer<typeof botStatusChangeEventSchema>;
export type BotRecordingReadyEvent = z.infer<typeof botRecordingReadyEventSchema>;
export type RecallWebhookEvent = z.infer<typeof recallWebhookEventSchema>;
