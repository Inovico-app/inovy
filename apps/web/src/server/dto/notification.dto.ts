import type { NotificationType } from "../db/schema/notifications";

/**
 * Notification DTO
 * Represents a notification for a user about processing events
 */
export interface NotificationDto {
  id: string;
  recordingId: string | null; // Nullable for bot_consent_request notifications
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

/**
 * Notification List Response DTO
 * Used for API responses that include notifications with metadata
 */
export interface NotificationListDto {
  notifications: NotificationDto[];
  unreadCount: number;
  total: number;
}

/**
 * Notification Filter DTO
 * Query parameters for filtering notifications
 */
export interface NotificationFiltersDto {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

