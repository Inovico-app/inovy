import { err, ok, type Result } from "neverthrow";
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
  ): Promise<Result<NotificationDto, string>> {
    try {
      const result = await NotificationsQueries.createNotification(data);

      if (result.isErr()) {
        return err(result.error.message);
      }

      // Invalidate cache for this user
      await this.invalidateCache(data.userId, data.organizationId);

      return ok(this.toDto(result.value));
    } catch (error) {
      const errorMessage = "Failed to create notification";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get notifications for the authenticated user with caching
   */
  static async getNotifications(
    filters?: NotificationFiltersDto
  ): Promise<Result<NotificationListDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get notifications using Next.js cache
      const notifications = await getCachedNotifications(
        authUser.id,
        organization.orgCode,
        filters
      );

      // Get unread count
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
      const errorMessage = "Failed to get notifications";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Get unread notification count for the authenticated user
   */
  static async getUnreadCount(): Promise<Result<number, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Get unread count using cached function
      const count = await getCachedUnreadCount(
        authUser.id,
        organization.orgCode
      );

      return ok(count);
    } catch (error) {
      const errorMessage = "Failed to get unread count";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Mark a notification as read with authorization check
   */
  static async markAsRead(
    notificationId: string
  ): Promise<Result<NotificationDto, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Mark as read (includes authorization check)
      const result = await NotificationsQueries.markAsRead(
        notificationId,
        authUser.id
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      // Invalidate cache
      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(this.toDto(result.value));
    } catch (error) {
      const errorMessage = "Failed to mark notification as read";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Mark all notifications as read for the authenticated user
   */
  static async markAllAsRead(): Promise<Result<number, string>> {
    try {
      // Check authentication and get session
      const authResult = await getAuthSession();
      if (authResult.isErr()) {
        return err("Failed to get authentication session");
      }

      const { user: authUser, organization } = authResult.value;

      if (!authUser || !organization) {
        return err("Authentication required");
      }

      // Mark all as read
      const result = await NotificationsQueries.markAllAsRead(
        authUser.id,
        organization.orgCode
      );

      if (result.isErr()) {
        return err(result.error.message);
      }

      // Invalidate cache
      await this.invalidateCache(authUser.id, organization.orgCode);

      return ok(result.value);
    } catch (error) {
      const errorMessage = "Failed to mark all notifications as read";
      logger.error(errorMessage, {}, error as Error);
      return err(errorMessage);
    }
  }

  /**
   * Invalidate notification cache for a user
   * Called after notification mutations (create, update, mark as read)
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

