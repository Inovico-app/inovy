import type { BotStatus } from "@/server/db/schema/bot-sessions";

/**
 * Map Recall.ai status strings to internal BotStatus enum
 * Recall.ai statuses: "joining", "active", "done", "failed", "rejected", etc.
 */
export function mapRecallStatusToBotStatus(recallStatus: string): BotStatus {
  const normalized = recallStatus.toLowerCase().trim();

  // Map Recall.ai statuses to internal statuses
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

  return statusMap[normalized] ?? "failed"; // Default to failed for unknown statuses
}

