"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import type { Route } from "next";
import Link from "next/link";
import type { Notification } from "../types";
import { NotificationIcon } from "./notification-icon";

interface RegularNotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onMarkRead: (e: React.MouseEvent) => void;
  onLinkClick?: () => void;
}

/**
 * Regular notification item component
 * Renders notifications with icon, title, message, and mark as read button
 */
export function RegularNotificationItem({
  notification,
  compact = false,
  onMarkRead,
  onLinkClick,
}: RegularNotificationItemProps) {
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: nl,
  });

  const content = (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm", !notification.isRead && "font-semibold")}>
            {notification.title}
          </p>
          {!notification.isRead && !compact && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={onMarkRead}
            >
              Markeer gelezen
            </Button>
          )}
        </div>
        {!compact && (
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  );

  // If no projectId, render as non-clickable div
  if (!notification.projectId) {
    return (
      <div
        className={cn(
          "block p-3 hover:bg-muted/50 transition-colors",
          !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
        )}
      >
        {content}
      </div>
    );
  }

  // Render as link to recording or project
  const href = (
    notification.recordingId
      ? `/projects/${notification.projectId}/recordings/${notification.recordingId}`
      : `/projects/${notification.projectId}`
  ) as Route;

  return (
    <Link
      href={href}
      className={cn(
        "block p-3 hover:bg-muted/50 transition-colors",
        !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
      )}
      onClick={onLinkClick}
    >
      {content}
    </Link>
  );
}

