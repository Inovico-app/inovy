import type { Notification } from "@/features/notifications/types";

interface BotConsentNotificationContentProps {
  notification: Notification;
  meetingTime?: string;
  isCompleted?: boolean;
}

/**
 * Content display for bot consent notification
 */
export function BotConsentNotificationContent({
  notification,
  meetingTime,
  isCompleted = false,
}: BotConsentNotificationContentProps) {
  return (
    <div>
      <p className="text-sm font-medium">{notification.title}</p>
      <p className="text-sm text-muted-foreground mt-1">
        {notification.message}
      </p>
      {meetingTime && (
        <p className="text-xs text-muted-foreground mt-1">
          {isCompleted ? "Meeting:" : "Meeting time:"} {meetingTime}
        </p>
      )}
    </div>
  );
}

