import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import {
  notifications,
  type NewNotification,
  type Notification,
} from "@/server/db/schema/notifications";
import { and, desc, eq, sql } from "drizzle-orm";
import { err, ok, type Result } from "neverthrow";
import type { NotificationFiltersDto } from "../dto/notification.dto";

/**
 * Data access layer for notifications
 */
export class NotificationsQueries {
  /**
   * Create a new notification
   */
  static async createNotification(
    data: NewNotification
  ): Promise<Result<Notification, Error>> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values(data)
        .returning();

      logger.info("Notification created", {
        component: "NotificationsQueries.createNotification",
        notificationId: notification.id,
        type: data.type,
        userId: data.userId,
      });

      return ok(notification);
    } catch (error) {
      logger.error("Failed to create notification", {
        component: "NotificationsQueries.createNotification",
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to create notification")
      );
    }
  }

  /**
   * Get notifications for a user with optional filters
   */
  static async getNotificationsByUser(
    userId: string,
    orgCode: string,
    filters?: NotificationFiltersDto
  ): Promise<Result<Notification[], Error>> {
    try {
      const conditions = [
        eq(notifications.userId, userId),
        eq(notifications.organizationId, orgCode),
      ];

      // Apply filters
      if (filters?.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      if (filters?.type) {
        conditions.push(eq(notifications.type, filters.type));
      }

      const query = db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt));

      // Apply pagination
      if (filters?.limit) {
        query.limit(filters.limit);
      }
      if (filters?.offset) {
        query.offset(filters.offset);
      }

      const notificationList = await query;

      return ok(notificationList);
    } catch (error) {
      logger.error("Failed to fetch notifications", {
        component: "NotificationsQueries.getNotificationsByUser",
        userId,
        orgCode,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch notifications")
      );
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(
    userId: string,
    orgCode: string
  ): Promise<Result<number, Error>> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.organizationId, orgCode),
            eq(notifications.isRead, false)
          )
        );

      const count = result[0]?.count ?? 0;

      return ok(count);
    } catch (error) {
      logger.error("Failed to get unread count", {
        component: "NotificationsQueries.getUnreadCount",
        userId,
        orgCode,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to get unread count")
      );
    }
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Result<Notification, Error>> {
    try {
      // First verify the notification belongs to the user
      const [existing] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1);

      if (!existing) {
        return err(new Error("Notification not found"));
      }

      if (existing.userId !== userId) {
        return err(new Error("Unauthorized to mark this notification as read"));
      }

      const [updated] = await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(notifications.id, notificationId))
        .returning();

      if (!updated) {
        return err(new Error("Failed to update notification"));
      }

      logger.info("Notification marked as read", {
        component: "NotificationsQueries.markAsRead",
        notificationId,
        userId,
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to mark notification as read", {
        component: "NotificationsQueries.markAsRead",
        notificationId,
        userId,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to mark notification as read")
      );
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(
    userId: string,
    orgCode: string
  ): Promise<Result<number, Error>> {
    try {
      const result = await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.organizationId, orgCode),
            eq(notifications.isRead, false)
          )
        )
        .returning();

      const count = result.length;

      logger.info("All notifications marked as read", {
        component: "NotificationsQueries.markAllAsRead",
        userId,
        orgCode,
        count,
      });

      return ok(count);
    } catch (error) {
      logger.error("Failed to mark all notifications as read", {
        component: "NotificationsQueries.markAllAsRead",
        userId,
        orgCode,
        error,
      });
      return err(
        error instanceof Error
          ? error
          : new Error("Failed to mark all notifications as read")
      );
    }
  }

  /**
   * Get a single notification by ID
   */
  static async getNotificationById(
    notificationId: string
  ): Promise<Result<Notification | null, Error>> {
    try {
      const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notificationId))
        .limit(1);

      return ok(notification ?? null);
    } catch (error) {
      logger.error("Failed to fetch notification by ID", {
        component: "NotificationsQueries.getNotificationById",
        notificationId,
        error,
      });
      return err(
        error instanceof Error ? error : new Error("Failed to fetch notification")
      );
    }
  }
}

