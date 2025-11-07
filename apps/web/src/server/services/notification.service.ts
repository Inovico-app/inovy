import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { getAuthSession } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import { logger } from "../../lib/logger";
import { NotificationsQueries } from "../data-access/notifications.queries";
import {
  getCachedNotifications,
  getCachedUnreadCount,
} from "../cache/notification.cache";
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
    data: Omit<NewNotification, "id" | "createdAt">
  ): Promise<ActionResult<NotificationDto>> {
    try {
      const notification = await NotificationsQueries.createNotification(data);

      // Invalidate cache for this user
      await this.invalidateCache(data.userId, data.organizationId);

      return ok(this.toDto(notification));
    } catch (error) {
      logger.error("Failed to create notification", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to create notification",
          error as Error,
          "NotificationService.createNotification"
        )
      );
    }
  }

  /**
   * Get notifications for the authenticated user with caching
   */
  static async getNotifications(
    filters?: NotificationFiltersDto
  ): Promise<ActionResult<NotificationListDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "NotificationService.getNotifications"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "NotificationService.getNotifications"
          )
        );
      }

      const notifications = await getCachedNotifications(
        authUser.id,
        organization.orgCode,
        filters
      );

      const unreadCount = await getCachedUnreadCount(
        authUser.id,
        organization.orgCode
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
          "NotificationService.getNotifications"
        )
      );
    }
  }

  /**
   * Get unread notification count for the authenticated user
   */
  static async getUnreadCount(): Promise<ActionResult<number>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "NotificationService.getUnreadCount"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "NotificationService.getUnreadCount"
          )
        );
      }

      const count = await getCachedUnreadCount(
        authUser.id,
        organization.orgCode
      );

      return ok(count);
    } catch (error) {
      logger.error("Failed to get unread count", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get unread count",
          error as Error,
          "NotificationService.getUnreadCount"
        )
      );
    }
  }

  /**
   * Mark a notification as read with authorization check
   */
  static async markAsRead(
    notificationId: string
  ): Promise<ActionResult<NotificationDto>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "NotificationService.markAsRead"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "NotificationService.markAsRead"
          )
        );
      }

      const notification = await NotificationsQueries.markAsRead(
        notificationId,
        authUser.id
      );

      if (!notification) {
        return err(
          ActionErrors.notFound(
            "Notification",
            "NotificationService.markAsRead"
          )
        );
      }

      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(this.toDto(notification));
    } catch (error) {
      logger.error("Failed to mark notification as read", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to mark notification as read",
          error as Error,
          "NotificationService.markAsRead"
        )
      );
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   */
  static async markAllAsRead(): Promise<ActionResult<number>> {
    try {
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to get authentication session",
            undefined,
            "NotificationService.markAllAsRead"
          )
        );
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err(
          ActionErrors.forbidden(
            "Authentication required",
            undefined,
            "NotificationService.markAllAsRead"
          )
        );
      }

      const count = await NotificationsQueries.markAllAsRead(
        authUser.id,
        organization.orgCode
      );

      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(count);
    } catch (error) {
      logger.error("Failed to mark all notifications as read", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to mark all notifications as read",
          error as Error,
          "NotificationService.markAllAsRead"
        )
      );
    }
  }

  /**
   * Invalidate notification cache for a user
   */
  static async invalidateCache(userId: string, orgCode: string): Promise<void> {
    CacheInvalidation.invalidateNotifications(userId, orgCode);
  }

  /**
   * Convert database notification to DTO
   */
  private static toDto(notification: {
    id: string;
    recordingId: string;
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
