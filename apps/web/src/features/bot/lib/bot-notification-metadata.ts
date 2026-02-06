import type { Notification } from "@/features/notifications/types";

export interface BotNotificationMetadata {
  sessionId?: string;
  meetingTitle?: string;
  meetingTime?: string;
  action?: string;
}

/**
 * Safely parse bot notification metadata with runtime validation
 */
export function parseBotNotificationMetadata(notification: Notification): {
  sessionId: string | undefined;
  meetingTitle: string;
  meetingTime: string | undefined;
  action: string | undefined;
} {
  const metadata = notification.metadata ?? undefined;

  return {
    sessionId:
      typeof metadata?.sessionId === "string" ? metadata.sessionId : undefined,
    meetingTitle:
      typeof metadata?.meetingTitle === "string"
        ? metadata.meetingTitle
        : "meeting",
    meetingTime:
      typeof metadata?.meetingTime === "string"
        ? metadata.meetingTime
        : undefined,
    action: typeof metadata?.action === "string" ? metadata.action : undefined,
  };
}

