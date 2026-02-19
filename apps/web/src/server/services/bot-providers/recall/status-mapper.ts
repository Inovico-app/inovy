import type { BotStatus } from "@/server/db/schema/bot-sessions";

/**
 * Map Recall.ai status strings to internal BotStatus enum
 * Recall.ai statuses: "joining", "active", "done", "failed", "rejected", etc.
 */
export function mapRecallStatusToBotStatus(recallStatus: string): BotStatus {
  const normalized = recallStatus.toLowerCase().trim();

  const statusMap: Record<string, BotStatus> = {
    joining: "joining",
    active: "active",
    done: "completed",
    completed: "completed",
    failed: "failed",
    rejected: "failed",
    error: "failed",
    scheduled: "scheduled",
    pending: "pending_consent",
    pending_consent: "pending_consent",
  };

  return statusMap[normalized] ?? "failed";
}

/**
 * Map Recall.ai Svix event types to internal BotStatus
 * Per https://docs.recall.ai/docs/bot-status-change-events
 */
export function mapRecallEventToBotStatus(eventType: string): BotStatus {
  const eventMap: Record<string, BotStatus> = {
    "bot.joining_call": "joining",
    "bot.in_waiting_room": "joining",
    "bot.in_call_not_recording": "active",
    "bot.recording_permission_allowed": "active",
    "bot.recording_permission_denied": "pending_consent",
    "bot.in_call_recording": "active",
    "bot.call_ended": "leaving",
    "bot.done": "completed",
    "bot.fatal": "failed",
    "bot.breakout_room_entered": "active",
    "bot.breakout_room_left": "active",
    "bot.breakout_room_opened": "active",
    "bot.breakout_room_closed": "active",
  };

  return eventMap[eventType] ?? "failed";
}

