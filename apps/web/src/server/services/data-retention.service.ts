import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import { dataExports } from "@/server/db/schema/data-exports";
import { sessions } from "@/server/db/schema/auth";
import { recordings } from "@/server/db/schema/recordings";
import { and, lt, eq } from "drizzle-orm";

interface CleanupResult {
  deletedCount: number;
  errors: string[];
}

interface DataRetentionReport {
  expiredExports: CleanupResult;
  expiredSessions: CleanupResult;
  orphanedRecordings: CleanupResult;
  executedAt: string;
}

/**
 * Data Retention Service
 *
 * Handles automatic cleanup of expired data to comply with
 * ISO 27001 A.8.10 (Information deletion) and GDPR data minimization.
 */
export class DataRetentionService {
  /**
   * Run all data retention cleanup tasks
   */
  static async runAll(): Promise<DataRetentionReport> {
    const [expiredExports, expiredSessions, orphanedRecordings] =
      await Promise.all([
        this.cleanupExpiredExports(),
        this.cleanupExpiredSessions(),
        this.cleanupOrphanedRecordings(),
      ]);

    const report: DataRetentionReport = {
      expiredExports,
      expiredSessions,
      orphanedRecordings,
      executedAt: new Date().toISOString(),
    };

    logger.info("Data retention cleanup completed", {
      component: "DataRetentionService.runAll",
      report,
    });

    return report;
  }

  /**
   * Delete GDPR data exports older than 7 days past their expiration
   * Exports have a 7-day download window; after that, file data is purged.
   */
  static async cleanupExpiredExports(): Promise<CleanupResult> {
    const result: CleanupResult = { deletedCount: 0, errors: [] };

    try {
      const now = new Date();

      const deleted = await db
        .delete(dataExports)
        .where(lt(dataExports.expiresAt, now))
        .returning({ id: dataExports.id });

      result.deletedCount = deleted.length;

      if (deleted.length > 0) {
        logger.info("Cleaned up expired data exports", {
          component: "DataRetentionService.cleanupExpiredExports",
          deletedCount: deleted.length,
          exportIds: deleted.map((d) => d.id),
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      logger.error("Failed to cleanup expired data exports", {
        component: "DataRetentionService.cleanupExpiredExports",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    return result;
  }

  /**
   * Delete sessions that have passed their expiresAt timestamp
   * Better Auth sessions have an expiresAt field set during creation.
   */
  static async cleanupExpiredSessions(): Promise<CleanupResult> {
    const result: CleanupResult = { deletedCount: 0, errors: [] };

    try {
      const now = new Date();

      const deleted = await db
        .delete(sessions)
        .where(lt(sessions.expiresAt, now))
        .returning({ id: sessions.id });

      result.deletedCount = deleted.length;

      if (deleted.length > 0) {
        logger.info("Cleaned up expired sessions", {
          component: "DataRetentionService.cleanupExpiredSessions",
          deletedCount: deleted.length,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      logger.error("Failed to cleanup expired sessions", {
        component: "DataRetentionService.cleanupExpiredSessions",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    return result;
  }

  /**
   * Delete recordings that have been archived (soft-deleted) and are past
   * the retention period (90 days after being archived).
   */
  static async cleanupOrphanedRecordings(): Promise<CleanupResult> {
    const result: CleanupResult = { deletedCount: 0, errors: [] };

    try {
      // Recordings archived more than 90 days ago
      const retentionCutoff = new Date();
      retentionCutoff.setDate(retentionCutoff.getDate() - 90);

      const deleted = await db
        .delete(recordings)
        .where(
          and(
            eq(recordings.status, "archived"),
            lt(recordings.updatedAt, retentionCutoff),
          ),
        )
        .returning({ id: recordings.id });

      result.deletedCount = deleted.length;

      if (deleted.length > 0) {
        logger.info("Cleaned up orphaned archived recordings", {
          component: "DataRetentionService.cleanupOrphanedRecordings",
          deletedCount: deleted.length,
          recordingIds: deleted.map((d) => d.id),
          retentionCutoff: retentionCutoff.toISOString(),
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      logger.error("Failed to cleanup orphaned recordings", {
        component: "DataRetentionService.cleanupOrphanedRecordings",
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    return result;
  }
}
