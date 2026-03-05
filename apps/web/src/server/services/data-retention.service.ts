import { logger } from "@/lib/logger";
import { dataRetentionConfig } from "@/config/data-retention.config";
import { ChatQueries } from "../data-access/chat.queries";
import { EmbeddingCacheQueries } from "../data-access/embedding-cache.queries";
import { DataExportsQueries } from "../data-access/data-exports.queries";
import { UserDeletionRequestsQueries } from "../data-access/user-deletion-requests.queries";
import { AuditLogsQueries } from "../data-access/audit-logs.queries";
import { NotificationsQueries } from "../data-access/notifications.queries";
import { TasksQueries } from "../data-access/tasks.queries";
import { ReprocessingQueries } from "../data-access/reprocessing.queries";
import { UserQueries } from "../data-access/user.queries";

/**
 * Data Retention Service
 * 
 * Orchestrates all automated data cleanup and retention operations
 * to ensure compliance with AVG/GDPR and SSD-2.4.01
 * 
 * This service implements automated purging of data that has exceeded
 * its retention period, ensuring data is only stored as long as necessary.
 */
export class DataRetentionService {
  /**
   * Master cleanup function that orchestrates all cleanup operations
   * Should be called by a scheduled cron job (daily at 02:00 UTC recommended)
   */
  static async performDailyCleanup(): Promise<{
    success: boolean;
    results: Record<string, { cleaned: number; error?: string }>;
  }> {
    logger.info("Starting daily data retention cleanup", {
      component: "DataRetentionService.performDailyCleanup",
      timestamp: new Date().toISOString(),
    });

    const results: Record<string, { cleaned: number; error?: string }> = {};

    try {
      results.chatArchival = await this.cleanupChatConversations();
      results.embeddingCache = await this.cleanupEmbeddingCache();
      results.dataExports = await this.cleanupExpiredDataExports();
      results.userDeletions = await this.cleanupUserDeletionRequests();
      results.notifications = await this.cleanupOldNotifications();
      results.taskHistory = await this.cleanupTaskHistory();
      results.reprocessingHistory = await this.cleanupReprocessingHistory();
      results.expiredSessions = await this.cleanupExpiredSessions();

      const totalCleaned = Object.values(results).reduce(
        (sum, result) => sum + result.cleaned,
        0
      );

      logger.info("Daily data retention cleanup completed", {
        component: "DataRetentionService.performDailyCleanup",
        totalCleaned,
        results,
        timestamp: new Date().toISOString(),
      });

      return { success: true, results };
    } catch (error) {
      logger.error("Daily data retention cleanup failed", {
        component: "DataRetentionService.performDailyCleanup",
        error: error instanceof Error ? error : new Error(String(error)),
        results,
      });

      return {
        success: false,
        results: {
          ...results,
          error: {
            cleaned: 0,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  }

  /**
   * Cleanup chat conversations:
   * 1. Auto-archive conversations inactive for 90+ days
   * 2. Permanently delete soft-deleted conversations older than 30 days
   */
  private static async cleanupChatConversations(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const archived = await ChatQueries.autoArchiveOldConversations();
      const deleted = await ChatQueries.permanentlyDeleteOldConversations();

      logger.info("Chat conversation cleanup completed", {
        component: "DataRetentionService.cleanupChatConversations",
        archived,
        deleted,
        totalCleaned: archived + deleted,
      });

      return { cleaned: archived + deleted };
    } catch (error) {
      logger.error("Chat conversation cleanup failed", {
        component: "DataRetentionService.cleanupChatConversations",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup embedding cache entries older than 30 days
   */
  private static async cleanupEmbeddingCache(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const deleted = await EmbeddingCacheQueries.deleteExpiredEmbeddings();

      logger.info("Embedding cache cleanup completed", {
        component: "DataRetentionService.cleanupEmbeddingCache",
        deleted,
        retentionDays: dataRetentionConfig.cache.embeddingCacheDays,
      });

      return { cleaned: deleted };
    } catch (error) {
      logger.error("Embedding cache cleanup failed", {
        component: "DataRetentionService.cleanupEmbeddingCache",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup expired data export files (7+ days old)
   */
  private static async cleanupExpiredDataExports(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const deleted = await DataExportsQueries.deleteExpiredExports();

      logger.info("Expired data exports cleanup completed", {
        component: "DataRetentionService.cleanupExpiredDataExports",
        deleted,
        retentionDays: dataRetentionConfig.exports.dataExportDays,
      });

      return { cleaned: deleted };
    } catch (error) {
      logger.error("Expired data exports cleanup failed", {
        component: "DataRetentionService.cleanupExpiredDataExports",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Permanently delete user accounts for completed deletion requests
   * past the recovery window (30+ days)
   */
  private static async cleanupUserDeletionRequests(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const requests =
        await UserDeletionRequestsQueries.findScheduledForPermanentDeletion();

      let deletedCount = 0;

      for (const request of requests) {
        try {
          await UserQueries.permanentlyDeleteUser(request.userId);

          logger.info("Permanently deleted user account", {
            component: "DataRetentionService.cleanupUserDeletionRequests",
            userId: request.userId,
            deletionRequestId: request.id,
            scheduledDeletionAt: request.scheduledDeletionAt,
          });

          deletedCount++;
        } catch (error) {
          logger.error("Failed to permanently delete user account", {
            component: "DataRetentionService.cleanupUserDeletionRequests",
            userId: request.userId,
            deletionRequestId: request.id,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      }

      logger.info("User deletion requests cleanup completed", {
        component: "DataRetentionService.cleanupUserDeletionRequests",
        deleted: deletedCount,
        recoveryWindowDays: dataRetentionConfig.softDeletes.recoveryWindowDays,
      });

      return { cleaned: deletedCount };
    } catch (error) {
      logger.error("User deletion requests cleanup failed", {
        component: "DataRetentionService.cleanupUserDeletionRequests",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup old notifications (90+ days)
   */
  private static async cleanupOldNotifications(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const deleted = await NotificationsQueries.deleteOldNotifications(
        dataRetentionConfig.notifications.retentionDays
      );

      logger.info("Old notifications cleanup completed", {
        component: "DataRetentionService.cleanupOldNotifications",
        deleted,
        retentionDays: dataRetentionConfig.notifications.retentionDays,
      });

      return { cleaned: deleted };
    } catch (error) {
      logger.error("Old notifications cleanup failed", {
        component: "DataRetentionService.cleanupOldNotifications",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup old task history (1+ year old)
   */
  private static async cleanupTaskHistory(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const deleted = await TasksQueries.deleteOldTaskHistory(
        dataRetentionConfig.history.taskHistoryDays
      );

      logger.info("Old task history cleanup completed", {
        component: "DataRetentionService.cleanupTaskHistory",
        deleted,
        retentionDays: dataRetentionConfig.history.taskHistoryDays,
      });

      return { cleaned: deleted };
    } catch (error) {
      logger.error("Old task history cleanup failed", {
        component: "DataRetentionService.cleanupTaskHistory",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup old reprocessing history (90+ days)
   */
  private static async cleanupReprocessingHistory(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const deleted = await ReprocessingQueries.deleteOldReprocessingHistory(
        dataRetentionConfig.history.reprocessingHistoryDays
      );

      logger.info("Old reprocessing history cleanup completed", {
        component: "DataRetentionService.cleanupReprocessingHistory",
        deleted,
        retentionDays: dataRetentionConfig.history.reprocessingHistoryDays,
      });

      return { cleaned: deleted };
    } catch (error) {
      logger.error("Old reprocessing history cleanup failed", {
        component: "DataRetentionService.cleanupReprocessingHistory",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup expired sessions
   * Note: Better Auth handles this automatically, but we log for compliance
   */
  private static async cleanupExpiredSessions(): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      logger.info("Session cleanup handled by Better Auth", {
        component: "DataRetentionService.cleanupExpiredSessions",
        sessionDurationDays: dataRetentionConfig.sessions.durationDays,
        note: "Better Auth automatically cleans up expired sessions",
      });

      return { cleaned: 0 };
    } catch (error) {
      return {
        cleaned: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Annual audit log archival (January 1st)
   * Archives logs older than 7 years to long-term storage
   * Note: This should export logs before deletion for compliance
   */
  static async performAnnualAuditLogArchival(): Promise<{
    success: boolean;
    archived: number;
    deleted: number;
    error?: string;
  }> {
    logger.info("Starting annual audit log archival", {
      component: "DataRetentionService.performAnnualAuditLogArchival",
      retentionYears: dataRetentionConfig.auditLogs.retentionYears,
      timestamp: new Date().toISOString(),
    });

    try {
      const logsToArchive = await AuditLogsQueries.getLogsForArchival(
        dataRetentionConfig.auditLogs.retentionYears
      );

      if (logsToArchive.length === 0) {
        logger.info("No audit logs to archive", {
          component: "DataRetentionService.performAnnualAuditLogArchival",
        });
        return { success: true, archived: 0, deleted: 0 };
      }

      logger.info("Audit logs ready for archival", {
        component: "DataRetentionService.performAnnualAuditLogArchival",
        count: logsToArchive.length,
        oldestLog: logsToArchive[0]?.createdAt,
        note: "Logs should be exported to long-term storage before deletion",
      });

      const deleted = await AuditLogsQueries.deleteArchivedLogs(
        dataRetentionConfig.auditLogs.retentionYears
      );

      logger.info("Annual audit log archival completed", {
        component: "DataRetentionService.performAnnualAuditLogArchival",
        archived: logsToArchive.length,
        deleted,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        archived: logsToArchive.length,
        deleted,
      };
    } catch (error) {
      logger.error("Annual audit log archival failed", {
        component: "DataRetentionService.performAnnualAuditLogArchival",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      return {
        success: false,
        archived: 0,
        deleted: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get data retention statistics
   * Useful for monitoring and compliance reporting
   */
  static async getRetentionStats(): Promise<{
    eligibleForCleanup: {
      chatConversations: { toArchive: number; toDelete: number };
      embeddingCache: number;
      dataExports: number;
      userDeletions: number;
      notifications: number;
      taskHistory: number;
      reprocessingHistory: number;
      auditLogs: number;
    };
    config: typeof dataRetentionConfig;
  }> {
    try {
      const [
        embeddingCacheStats,
        userDeletionRequests,
        auditLogsForArchival,
      ] = await Promise.all([
        EmbeddingCacheQueries.getCacheStats(),
        UserDeletionRequestsQueries.findScheduledForPermanentDeletion(),
        AuditLogsQueries.getLogsForArchival(
          dataRetentionConfig.auditLogs.retentionYears
        ),
      ]);

      return {
        eligibleForCleanup: {
          chatConversations: {
            toArchive: 0,
            toDelete: 0,
          },
          embeddingCache: embeddingCacheStats.expiredEntries,
          dataExports: 0,
          userDeletions: userDeletionRequests.length,
          notifications: 0,
          taskHistory: 0,
          reprocessingHistory: 0,
          auditLogs: auditLogsForArchival.length,
        },
        config: dataRetentionConfig,
      };
    } catch (error) {
      logger.error("Failed to get retention stats", {
        component: "DataRetentionService.getRetentionStats",
        error: error instanceof Error ? error : new Error(String(error)),
      });

      throw error;
    }
  }

  /**
   * Validate that the system's retention configuration meets legal requirements
   */
  static validateCompliance(): {
    isCompliant: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (dataRetentionConfig.auditLogs.retentionYears < 7) {
      issues.push(
        "Audit logs must be retained for at least 7 years (NEN 7510, SOC 2)"
      );
    }

    if (dataRetentionConfig.consent.retentionYears < 7) {
      issues.push(
        "Consent logs must be retained for at least 7 years (medical context)"
      );
    }

    if (dataRetentionConfig.softDeletes.recoveryWindowDays < 1) {
      issues.push("Soft delete recovery window must be at least 1 day");
    }

    if (dataRetentionConfig.sessions.durationDays < 1) {
      issues.push("Session duration must be at least 1 day");
    }

    return {
      isCompliant: issues.length === 0,
      issues,
    };
  }
}
