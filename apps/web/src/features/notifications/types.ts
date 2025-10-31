import type { NotificationType } from "@/server/db/schema/notifications";

/**
 * Client-side notification types and interfaces
 */

export interface Notification {
  id: string;
  recordingId: string;
  projectId: string;
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
  total: number;
}

