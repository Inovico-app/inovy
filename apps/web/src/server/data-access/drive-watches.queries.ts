import { and, eq, lt } from "drizzle-orm";
import { db } from "../db";
import {
  driveWatches,
  type DriveWatch,
  type NewDriveWatch,
} from "../db/schema/drive-watches";

/**
 * Drive Watches Queries
 * Manages Google Drive watch subscriptions for monitoring folder file uploads
 */
export class DriveWatchesQueries {
  /**
   * Create a new watch record
   */
  static async createWatch(data: NewDriveWatch): Promise<DriveWatch> {
    return await db.transaction(async (tx) => {
      const [watch] = await tx
        .insert(driveWatches)
        .values({ ...data, updatedAt: new Date() })
        .returning();
      return watch;
    });
  }

  /**
   * Get active watch for a user and folder
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
    return watch ?? null;
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
    return watch ?? null;
  }

  /**
   * Get watch by ID
   */
  static async getWatchById(id: string): Promise<DriveWatch | null> {
    const [watch] = await db
      .select()
      .from(driveWatches)
      .where(eq(driveWatches.id, id))
      .limit(1);
    return watch ?? null;
  }

  /**
   * Get watches expiring before threshold (in milliseconds)
   */
  static async getExpiringWatches(thresholdMs: number): Promise<DriveWatch[]> {
    return await db
      .select()
      .from(driveWatches)
      .where(
        and(
          eq(driveWatches.isActive, true),
          lt(driveWatches.expiration, thresholdMs)
        )
      );
  }

  /**
   * Deactivate a watch by setting isActive = false
   */
  static async deactivateWatch(channelId: string): Promise<DriveWatch | null> {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(driveWatches)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(driveWatches.channelId, channelId))
        .returning();
      return updated ?? null;
    });
  }

  /**
   * Hard delete a watch by channel ID
   */
  static async deleteWatch(channelId: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const result = await tx
        .delete(driveWatches)
        .where(eq(driveWatches.channelId, channelId));
      return (result?.rowCount ?? 0) > 0;
    });
  }

  /**
   * List all active watches for a user
   */
  static async getActiveWatchesByUser(userId: string): Promise<DriveWatch[]> {
    return await db
      .select()
      .from(driveWatches)
      .where(
        and(eq(driveWatches.userId, userId), eq(driveWatches.isActive, true))
      );
  }
}

