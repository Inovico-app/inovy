import { db } from "@/server/db";
import {
  notifications,
  type NewNotification,
  type Notification,
} from "@/server/db/schema/notifications";
import { and, desc, eq, sql } from "drizzle-orm";
import type { NotificationFiltersDto } from "../dto/notification.dto";

/**
 * Data access layer for notifications (pure DB ops only)
 */
export class NotificationsQueries {
  /** Create a new notification */
  static async createNotification(
    data: NewNotification
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  /** Get notifications for a user with optional filters */
  static async getNotificationsByUser(
    userId: string,
    orgCode: string,
    filters?: NotificationFiltersDto
  ): Promise<Notification[]> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.organizationId, orgCode),
    ];
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
    if (filters?.limit) {
      query.limit(filters.limit);
    }
    if (filters?.offset) {
      query.offset(filters.offset);
    }
    return await query;
  }

  /** Get unread notification count for a user */
  static async getUnreadCount(
    userId: string,
    orgCode: string
  ): Promise<number> {
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
    return result[0]?.count ?? 0;
  }

  /** Mark a single notification as read */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<Notification | undefined> {
    // Verify notification belongs to user would be service logic now
    const [existing] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
    if (!existing) return undefined;
    if (existing.userId !== userId) return undefined;
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning();
    return updated;
  }

  /** Mark all notifications as read for a user */
  static async markAllAsRead(userId: string, orgCode: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.organizationId, orgCode),
          eq(notifications.isRead, false)
        )
      )
      .returning();
    return result.length;
  }

  /** Get a single notification by ID */
  static async getNotificationById(
    notificationId: string
  ): Promise<Notification | null> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);
    return notification ?? null;
  }
}

