import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db";
import {
  driveWatches,
  type DriveWatch,
  type NewDriveWatch,
} from "../db/schema";

/**
 * Drive Watches Queries
 * Manages Drive watch subscriptions in the database
 */
export class DriveWatchesQueries {
  /**
   * Create a new watch record
   */
  static async createWatch(data: NewDriveWatch): Promise<DriveWatch> {
    const [watch] = await db.insert(driveWatches).values(data).returning();
    return watch;
  }

  /**
   * Get active watch for user and folder
   */
  static async getWatchByUserAndFolder(
    userId: string,
    folderId: string
  ): Promise<DriveWatch | null> {
    const [watch] = await db
      .select()
      .from(driveWatches)
      .where(
        and(
          eq(driveWatches.userId, userId),
          eq(driveWatches.folderId, folderId),
          eq(driveWatches.isActive, true)
        )
      )
      .limit(1);

    return watch || null;
  }

  /**
   * Get watch by channel ID
   */
  static async getWatchByChannel(
    channelId: string
  ): Promise<DriveWatch | null> {
    const [watch] = await db
      .select()
      .from(driveWatches)
      .where(eq(driveWatches.channelId, channelId))
      .limit(1);

    return watch || null;
  }

  /**
   * Get watches expiring before threshold (in milliseconds from now)
   */
  static async getExpiringWatches(
    thresholdMs: number
  ): Promise<DriveWatch[]> {
    const threshold = Date.now() + thresholdMs;

    const watches = await db
      .select()
      .from(driveWatches)
      .where(
        and(
          sql`${driveWatches.expiration} < ${threshold}`,
          eq(driveWatches.isActive, true)
        )
      );

    return watches;
  }

  /**
   * Deactivate a watch (set isActive = false)
   */
  static async deactivateWatch(channelId: string): Promise<DriveWatch | null> {
    const [updated] = await db
      .update(driveWatches)
      .set({ isActive: false })
      .where(eq(driveWatches.channelId, channelId))
      .returning();

    return updated || null;
  }

  /**
   * Hard delete a watch
   */
  static async deleteWatch(channelId: string): Promise<boolean> {
    const result = await db
      .delete(driveWatches)
      .where(eq(driveWatches.channelId, channelId));

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get all active watches for a user
   */
  static async getActiveWatchesByUser(
    userId: string
  ): Promise<DriveWatch[]> {
    const watches = await db
      .select()
      .from(driveWatches)
      .where(
        and(eq(driveWatches.userId, userId), eq(driveWatches.isActive, true))
      )
      .orderBy(driveWatches.createdAt);

    return watches;
  }

  /**
   * Update watch record
   */
  static async updateWatch(
    channelId: string,
    data: Partial<DriveWatch>
  ): Promise<DriveWatch | null> {
    const [updated] = await db
      .update(driveWatches)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(driveWatches.channelId, channelId))
      .returning();

    return updated || null;
  }
}

