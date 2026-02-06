import type { NotificationType } from "@/server/db/schema/notifications";
import { Bot, CheckCircle2, FileText, ListChecks, XCircle } from "lucide-react";

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

/**
 * Icon component for different notification types
 */
export function NotificationIcon({ type, className }: NotificationIconProps) {
  switch (type) {
    case "transcription_completed":
      return <FileText className={className || "h-5 w-5 text-green-600"} />;
    case "transcription_failed":
      return <XCircle className={className || "h-5 w-5 text-red-600"} />;
    case "summary_completed":
      return <CheckCircle2 className={className || "h-5 w-5 text-blue-600"} />;
    case "summary_failed":
      return <XCircle className={className || "h-5 w-5 text-red-600"} />;
    case "tasks_completed":
      return <ListChecks className={className || "h-5 w-5 text-purple-600"} />;
    case "tasks_failed":
      return <XCircle className={className || "h-5 w-5 text-red-600"} />;
    case "bot_consent_request":
      return <Bot className={className || "h-5 w-5 text-blue-600"} />;
    default:
      return <FileText className={className || "h-5 w-5 text-gray-600"} />;
  }
}

