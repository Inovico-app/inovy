import { err, ok } from "neverthrow";
import type { AuthContext } from "../../lib/auth-context";
import { invalidateFor } from "../../lib/cache";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import {
  getCachedNotifications,
  getCachedUnreadCount,
} from "../cache/notification.cache";
import { NotificationsQueries } from "../data-access/notifications.queries";
import type { NewNotification } from "../db/schema/notifications";
import type {
  NotificationDto,
  NotificationFiltersDto,
  NotificationListDto,
} from "../dto/notification.dto";

/**
 * Business logic layer for Notification operations
 * Orchestrates data access and handles business rules
 */
export class NotificationService {
  /**
   * Create a new notification
   * Used by AI processing services to notify users
   */
  static async createNotification(
    data: Omit<NewNotification, "id" | "createdAt">,
  ): Promise<ActionResult<NotificationDto>> {
    try {
      const notification = await NotificationsQueries.createNotification(data);

      // Invalidate cache for this user
      invalidateFor("notification", "update", {
        userId: data.userId,
        organizationId: data.organizationId,
      });

      return ok(this.toDto(notification));
    } catch (error) {
      logger.error("Failed to create notification", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create notification",
          error as Error,
          "NotificationService.createNotification",
        ),
      );
    }
  }

  /**
   * Get notifications for the authenticated user with caching
   */
  static async getNotifications(
    auth: AuthContext,
    filters?: NotificationFiltersDto,
  ): Promise<ActionResult<NotificationListDto>> {
    try {
      const notifications = await getCachedNotifications(
        auth.user.id,
        auth.organizationId,
        filters,
      );

      const unreadCount = await getCachedUnreadCount(
        auth.user.id,
        auth.organizationId,
      );

      return ok({
        notifications: notifications.map((n) => this.toDto(n)),
        unreadCount,
        total: notifications.length,
      });
    } catch (error) {
      logger.error("Failed to get notifications", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get notifications",
          error as Error,
          "NotificationService.getNotifications",
        ),
      );
    }
  }

  /**
   * Get unread notification count for the authenticated user
   */
  static async getUnreadCount(
    auth: AuthContext,
  ): Promise<ActionResult<number>> {
    try {
      const count = await getCachedUnreadCount(
        auth.user.id,
        auth.organizationId,
      );

      return ok(count);
    } catch (error) {
      logger.error("Failed to get unread count", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get unread count",
          error as Error,
          "NotificationService.getUnreadCount",
        ),
      );
    }
  }

  /**
   * Mark a notification as read with authorization check
   */
  static async markAsRead(
    notificationId: string,
    auth: AuthContext,
  ): Promise<ActionResult<NotificationDto>> {
    try {
      // Get notification first to verify organization ownership
      const existingNotification =
        await NotificationsQueries.getNotificationById(notificationId);

      if (!existingNotification) {
        return err(
          ActionErrors.notFound(
            "Notification",
            "NotificationService.markAsRead",
          ),
        );
      }

      // Verify notification belongs to user's organization
      if (existingNotification.organizationId !== auth.organizationId) {
        return err(
          ActionErrors.notFound(
            "Notification not found",
            "NotificationService.markAsRead",
          ),
        );
      }

      const notification = await NotificationsQueries.markAsRead(
        notificationId,
        auth.user.id,
      );

      if (!notification) {
        return err(
          ActionErrors.notFound(
            "Notification",
            "NotificationService.markAsRead",
          ),
        );
      }

      await this.invalidateCache(auth.user.id, auth.organizationId);

      return ok(this.toDto(notification));
    } catch (error) {
      logger.error("Failed to mark notification as read", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to mark notification as read",
          error as Error,
          "NotificationService.markAsRead",
        ),
      );
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   */
  static async markAllAsRead(auth: AuthContext): Promise<ActionResult<number>> {
    try {
      const count = await NotificationsQueries.markAllAsRead(
        auth.user.id,
        auth.organizationId,
      );

      await this.invalidateCache(auth.user.id, auth.organizationId);

      return ok(count);
    } catch (error) {
      logger.error(
        "Failed to mark all notifications as read",
        {},
        error as Error,
      );
      return err(
        ActionErrors.internal(
          "Failed to mark all notifications as read",
          error as Error,
          "NotificationService.markAllAsRead",
        ),
      );
    }
  }

  /**
   * Invalidate notification cache for a user
   */
  static async invalidateCache(userId: string, orgCode: string): Promise<void> {
    invalidateFor("notification", "update", {
      userId,
      organizationId: orgCode,
    });
  }

  /**
   * Convert database notification to DTO
   */
  private static toDto(notification: {
    id: string;
    recordingId: string | null;
    projectId: string;
    userId: string;
    organizationId: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    metadata: unknown;
    createdAt: Date;
    readAt: Date | null;
  }): NotificationDto {
    return {
      id: notification.id,
      recordingId: notification.recordingId,
      projectId: notification.projectId,
      userId: notification.userId,
      organizationId: notification.organizationId,
      type: notification.type as NotificationDto["type"],
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      metadata: notification.metadata as Record<string, unknown> | null,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    };
  }
}
