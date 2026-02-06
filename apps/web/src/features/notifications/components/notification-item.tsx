"use client";

import { BotConsentNotification } from "@/features/bot/components/bot-consent-notification";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
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

  // Handle bot consent notifications specially
  if (notification.type === "bot_consent_request") {
    const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
      addSuffix: true,
      locale: nl,
    });

    return (
      <div
        className={cn(
          "block p-3 hover:bg-muted/50 transition-colors",
          !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
        )}
      >
        <BotConsentNotification
          notification={notification}
          onActionComplete={onRead}
        />
        <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
      </div>
    );
  }

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

