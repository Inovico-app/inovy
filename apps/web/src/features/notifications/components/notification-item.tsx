"use client";

import { CheckCircle2, XCircle, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarkReadMutation } from "../hooks/use-mark-read-mutation";
import type { Notification } from "../types";

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onRead?: () => void;
}

/**
 * Single notification item component
 * Shows type icon, title, message, and timestamp
 * Includes "mark as read" button for unread notifications
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

  const getIcon = () => {
    switch (notification.type) {
      case "transcription_completed":
        return <FileText className="h-5 w-5 text-green-600" />;
      case "transcription_failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "summary_completed":
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
      case "summary_failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "tasks_completed":
        return <ListChecks className="h-5 w-5 text-purple-600" />;
      case "tasks_failed":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: nl,
  });

  return (
    <Link
      href={`/projects/${notification.projectId}/recordings/${notification.recordingId}`}
      className={cn(
        "block p-3 hover:bg-muted/50 transition-colors",
        !notification.isRead && "bg-blue-50 dark:bg-blue-950/20"
      )}
      onClick={() => {
        if (!notification.isRead) {
          markReadMutation.mutate(notification.id);
        }
        onRead?.();
      }}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm",
                !notification.isRead && "font-semibold"
              )}
            >
              {notification.title}
            </p>
            {!notification.isRead && !compact && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={handleMarkRead}
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
    </Link>
  );
}

