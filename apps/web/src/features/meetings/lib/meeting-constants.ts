import type { MeetingStatus } from "@/server/db/schema/meetings";
import type { AgendaItemStatus } from "@/server/db/schema/meeting-agenda-items";
import type { PostActionStatus } from "@/server/db/schema/meeting-post-actions";

export const meetingStatusColors: Record<MeetingStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const agendaItemStatusColors: Record<AgendaItemStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  covered:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  skipped:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export const postActionStatusColors: Record<PostActionStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  skipped:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
