"use client";

import { useMarkReadMutation } from "../hooks/use-mark-read-mutation";
import type { Notification } from "../types";
import { RegularNotificationItem } from "./regular-notification-item";

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onRead?: () => void;
}

/**
 * Main notification item component
 * Routes to specialized components based on notification type
 */
export function NotificationItem({
  notification,
  compact = false,
  onRead,
}: NotificationItemProps) {
  const markReadMutation = useMarkReadMutation();

  const handleMarkRead = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    markReadMutation.mutate(notification.id, {
      onSuccess: () => {
        onRead?.();
      },
    });
  };

  // Handle regular notifications
  const handleLinkClick = () => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id, {
        onSuccess: () => {
          onRead?.();
        },
      });
    } else {
      onRead?.();
    }
  };

  return (
    <RegularNotificationItem
      notification={notification}
      compact={compact}
      onMarkRead={handleMarkRead}
      onLinkClick={handleLinkClick}
    />
  );
}
