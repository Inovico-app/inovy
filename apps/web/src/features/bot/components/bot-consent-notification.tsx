"use client";

import type { Notification } from "@/features/notifications/types";
import { useBotConsentNotification } from "../hooks/use-bot-consent-notification";
import { parseBotNotificationMetadata } from "../lib/bot-notification-metadata";
import { BotConsentNotificationActions } from "./bot-consent-notification-actions";
import { BotConsentNotificationContent } from "./bot-consent-notification-content";

interface BotConsentNotificationProps {
  notification: Notification;
  onActionComplete?: () => void;
}

/**
 * Component to display bot consent requests in notification feed
 * Shows meeting title and time with approve/deny actions
 */
export function BotConsentNotification({
  notification,
  onActionComplete,
}: BotConsentNotificationProps) {
  const { sessionId, meetingTitle, meetingTime, action } =
    parseBotNotificationMetadata(notification);

  const { actionInProgress, handleApprove, handleDeny } =
    useBotConsentNotification({
      sessionId,
      meetingTitle,
      onActionComplete,
    });

  // If action already taken, show confirmation message
  if (action === "approved" || action === "denied") {
    return (
      <div className="p-3">
        <BotConsentNotificationContent
          notification={notification}
          meetingTime={meetingTime}
          isCompleted={true}
        />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <BotConsentNotificationContent
        notification={notification}
        meetingTime={meetingTime}
      />
      <BotConsentNotificationActions
        actionInProgress={actionInProgress}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />
    </div>
  );
}

