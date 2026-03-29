import { createHash } from "crypto";
import { getStorageProvider } from "./storage";
import { err, ok } from "neverthrow";
import type { AuthContext } from "@/lib/auth-context";
import { logger } from "../../lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { AIInsightsQueries } from "../data-access/ai-insights.queries";
import { AuditLogsQueries } from "../data-access/audit-logs.queries";
import { ChatQueries } from "../data-access/chat.queries";
import { ConsentQueries } from "../data-access/consent.queries";
import { OAuthConnectionsQueries } from "../data-access/oauth-connections.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { SummaryHistoryQueries } from "../data-access/summary-history.queries";
import { TasksQueries } from "../data-access/tasks.queries";
import { UserDeletionRequestsQueries } from "../data-access/user-deletion-requests.queries";
import type { UserDeletionRequest } from "../db/schema/user-deletion-requests";
import { AuditLogService } from "./audit-log.service";

/**
 * GDPR Deletion Service
 * Handles right to be forgotten requests with anonymization and deletion
 */
export class GdprDeletionService {
  /**
   * Generate anonymized identifier for a user
   */
  private static generateAnonymizedId(userId: string): string {
    // Use a hash of the user ID to create a consistent anonymized identifier
    // This ensures the same user always gets the same anonymized ID
    const hash = createHash("sha256")
      .update(userId)
      .digest("hex")
      .substring(0, 16);
    return `user_${hash}`;
  }

  /**
   * Anonymize user mentions in text content
   */
  private static anonymizeText(
    text: string | null,
    userEmail: string | null,
    userName: string | null,
    anonymizedId: string,
  ): string | null {
    if (!text) return null;

    let anonymized = text;

    // Replace email addresses
    if (userEmail) {
      const emailRegex = new RegExp(
        userEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );
      anonymized = anonymized.replace(
        emailRegex,
        `${anonymizedId}@anonymized.local`,
      );
    }

    // Replace name mentions (case-insensitive)
    if (userName) {
      const nameParts = userName.split(" ");
      for (const part of nameParts) {
        if (part.length > 2) {
          const nameRegex = new RegExp(
            `\\b${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "gi",
          );
          anonymized = anonymized.replace(nameRegex, anonymizedId);
        }
      }
    }

    return anonymized;
  }

  /**
   * Create a deletion request
   */
  static async createDeletionRequest(
    userId: string,
    organizationId: string,
  ): Promise<ActionResult<string>> {
    try {
      // Check if there's already an active deletion request
      const existing = await UserDeletionRequestsQueries.findByUserId(userId);
      if (existing && existing.status !== "cancelled") {
        return err(
          ActionErrors.validation(
            "A deletion request already exists for this user",
            { requestId: existing.id },
          ),
        );
      }

      // Schedule deletion 30 days from now
      const scheduledDeletionAt = new Date();
      scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

      const request = await UserDeletionRequestsQueries.insert({
        userId,
        organizationId,
        status: "pending",
        scheduledDeletionAt,
      });

      // Log deletion request
      await AuditLogService.createAuditLog({
        eventType: "user_deleted",
        resourceType: "user",
        resourceId: null,
        userId,
        organizationId,
        action: "create",
        category: "mutation",
        metadata: {
          deletionRequestId: request.id,
          scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        },
      });

      logger.info("Created deletion request", {
        component: "GdprDeletionService.createDeletionRequest",
        userId,
        requestId: request.id,
      });

      return ok(request.id);
    } catch (error) {
      logger.error("Failed to create deletion request", {
        component: "GdprDeletionService.createDeletionRequest",
        userId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to create deletion request",
          error as Error,
          "GdprDeletionService.createDeletionRequest",
        ),
      );
    }
  }

  /**
   * Process deletion request (soft delete with anonymization)
   */
  static async processDeletionRequest(
    requestId: string,
    userId: string,
    organizationId: string,
    userEmail: string | null,
    userName: string | null,
  ): Promise<ActionResult<void>> {
    try {
      const request = await UserDeletionRequestsQueries.findById(requestId);
      if (!request || request.userId !== userId) {
        return err(
          ActionErrors.notFound(
            "Deletion request not found",
            "GdprDeletionService.processDeletionRequest",
          ),
        );
      }

      if (request.status === "completed") {
        return ok(undefined); // Already processed
      }

      // Update status to processing
      await UserDeletionRequestsQueries.updateStatus(requestId, "processing", {
        processedAt: new Date(),
      });

      const anonymizedId = this.generateAnonymizedId(userId);

      // 1. Delete user-owned recordings and their files
      await this.deleteUserOwnedRecordings(userId, organizationId);

      // 2. Anonymize recordings where user is a participant
      await this.anonymizeParticipantRecordings(
        userId,
        organizationId,
        userEmail,
        userName,
        anonymizedId,
      );

      // 3. Delete tasks created by user
      await this.deleteUserTasks(userId, organizationId);

      // 4. Delete summaries created by user
      await this.deleteUserSummaries(userId, organizationId);

      // 5. Delete chat conversations
      await this.deleteUserChatConversations(userId, organizationId);

      // 6. Anonymize audit logs
      await this.anonymizeAuditLogs(userId, organizationId, anonymizedId);

      // 7. Delete OAuth connections
      await this.deleteOAuthConnections(userId);

      // Update status to completed
      await UserDeletionRequestsQueries.updateStatus(requestId, "completed", {
        processedAt: new Date(),
      });

      // Log completion
      await AuditLogService.createAuditLog({
        eventType: "user_deleted",
        resourceType: "user",
        resourceId: null,
        userId: anonymizedId, // Use anonymized ID
        organizationId,
        action: "update",
        category: "mutation",
        metadata: {
          deletionRequestId: requestId,
          status: "completed",
        },
      });

      logger.info("Processed deletion request", {
        component: "GdprDeletionService.processDeletionRequest",
        userId,
        requestId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to process deletion request", {
        component: "GdprDeletionService.processDeletionRequest",
        userId,
        requestId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to process deletion request",
          error as Error,
          "GdprDeletionService.processDeletionRequest",
        ),
      );
    }
  }

  /**
   * Delete recordings owned by user
   */
  private static async deleteUserOwnedRecordings(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Get recordings owned by user directly via DB filter
    const ownedRecordings = await RecordingsQueries.selectRecordingsByCreator(
      organizationId,
      userId,
    );

    const storage = await getStorageProvider();

    for (const recording of ownedRecordings) {
      try {
        // Delete file from blob storage
        if (recording.fileUrl) {
          await storage.del(recording.fileUrl);
        }
      } catch (error) {
        logger.warn("Failed to delete recording file", {
          component: "GdprDeletionService.deleteUserOwnedRecordings",
          recordingId: recording.id,
          error,
        });
      }

      // Delete from database (cascade will handle related records)
      await RecordingsQueries.deleteRecording(recording.id, organizationId);
    }

    logger.info("Deleted user-owned recordings", {
      component: "GdprDeletionService.deleteUserOwnedRecordings",
      userId,
      count: ownedRecordings.length,
    });
  }

  /**
   * Anonymize recordings where user is a participant
   */
  private static async anonymizeParticipantRecordings(
    userId: string,
    organizationId: string,
    userEmail: string | null,
    userName: string | null,
    anonymizedId: string,
  ): Promise<void> {
    // Find recordings where user is a participant
    const participantRecords = await ConsentQueries.findByUserId(userId);

    const recordingIds = participantRecords.map(
      (p: { recordingId: string }) => p.recordingId,
    );

    if (recordingIds.length === 0) return;

    // Anonymize consent participants
    const anonymizedEmail = `${anonymizedId}@anonymized.local`;
    await ConsentQueries.anonymizeByRecordingIds(
      recordingIds,
      anonymizedEmail,
      anonymizedId,
    );

    // Batch fetch all recordings and insights at once to avoid N+1
    const [allRecordings, allInsights] = await Promise.all([
      RecordingsQueries.selectRecordingsByIds(recordingIds),
      AIInsightsQueries.getInsightsByRecordingIds(recordingIds),
    ]);

    // Anonymize transcription text
    for (const recording of allRecordings) {
      if (recording.transcriptionText) {
        const anonymizedText = this.anonymizeText(
          recording.transcriptionText,
          userEmail,
          userName,
          anonymizedId,
        );
        await RecordingsQueries.anonymizeTranscriptionText(
          recording.id,
          anonymizedText,
        );
      }
    }

    // Anonymize AI insights (speaker names)
    for (const insight of allInsights) {
      if (insight.speakerNames) {
        const speakerNames = insight.speakerNames as Record<string, string>;
        const anonymizedSpeakerNames: Record<string, string> = {};
        for (const [key, name] of Object.entries(speakerNames)) {
          if (userName && (name === userName || name.includes(userName))) {
            anonymizedSpeakerNames[key] = anonymizedId;
          } else {
            anonymizedSpeakerNames[key] = name;
          }
        }
        await AIInsightsQueries.anonymizeSpeakerNames(
          insight.id,
          anonymizedSpeakerNames,
        );
      }
    }

    logger.info("Anonymized participant recordings", {
      component: "GdprDeletionService.anonymizeParticipantRecordings",
      userId,
      count: recordingIds.length,
    });
  }

  /**
   * Delete tasks created by user
   */
  private static async deleteUserTasks(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const createdTasks = await TasksQueries.getTasksByCreator(
      organizationId,
      userId,
    );

    if (createdTasks.length === 0) return;

    // Delete tasks created by user
    await TasksQueries.deleteByIds(
      createdTasks.map((t) => t.id),
      organizationId,
    );

    // Also anonymize tasks where user is assignee
    await TasksQueries.anonymizeAssigneeByUserId(userId, organizationId);

    logger.info("Deleted user tasks", {
      component: "GdprDeletionService.deleteUserTasks",
      userId,
      count: createdTasks.length,
    });
  }

  /**
   * Delete summaries created by user
   */
  private static async deleteUserSummaries(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Get recordings owned by user directly via DB filter
    const ownedRecordings = await RecordingsQueries.selectRecordingsByCreator(
      organizationId,
      userId,
    );

    const ownedRecordingIds = ownedRecordings.map((r) => r.id);

    if (ownedRecordingIds.length === 0) return;

    // Delete summary history for user's recordings
    await SummaryHistoryQueries.deleteByRecordingIdsAndUserId(
      ownedRecordingIds,
      userId,
    );

    logger.info("Deleted user summaries", {
      component: "GdprDeletionService.deleteUserSummaries",
      userId,
      count: ownedRecordingIds.length,
    });
  }

  /**
   * Delete chat conversations
   */
  private static async deleteUserChatConversations(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const conversations = await ChatQueries.getConversationsByOrganizationId(
      organizationId,
      userId,
    );

    const conversationIds = conversations.map((c) => c.id);

    if (conversationIds.length === 0) return;

    // Delete conversations (cascade will handle messages)
    await ChatQueries.deleteByUserIdAndOrganizationId(userId, organizationId);

    logger.info("Deleted user chat conversations", {
      component: "GdprDeletionService.deleteUserChatConversations",
      userId,
      count: conversationIds.length,
    });
  }

  /**
   * Anonymize audit logs
   */
  private static async anonymizeAuditLogs(
    userId: string,
    organizationId: string,
    anonymizedId: string,
  ): Promise<void> {
    await AuditLogsQueries.anonymizeByUserId(
      userId,
      organizationId,
      anonymizedId,
    );

    logger.info("Anonymized audit logs", {
      component: "GdprDeletionService.anonymizeAuditLogs",
      userId,
    });
  }

  /**
   * Delete OAuth connections
   */
  private static async deleteOAuthConnections(userId: string): Promise<void> {
    await OAuthConnectionsQueries.deleteByUserId(userId);

    logger.info("Deleted OAuth connections", {
      component: "GdprDeletionService.deleteOAuthConnections",
      userId,
    });
  }

  /**
   * Cancel a deletion request
   */
  static async cancelDeletionRequest(
    requestId: string,
    userId: string,
    cancelledBy: string,
  ): Promise<ActionResult<void>> {
    try {
      const request = await UserDeletionRequestsQueries.findById(requestId);
      if (!request || request.userId !== userId) {
        return err(
          ActionErrors.notFound(
            "Deletion request not found",
            "GdprDeletionService.cancelDeletionRequest",
          ),
        );
      }

      if (request.status === "completed") {
        return err(
          ActionErrors.validation(
            "Cannot cancel a completed deletion request",
            {},
          ),
        );
      }

      await UserDeletionRequestsQueries.cancel(requestId, cancelledBy);

      // Log cancellation
      await AuditLogService.createAuditLog({
        eventType: "user_deleted",
        resourceType: "user",
        resourceId: null,
        userId: cancelledBy,
        organizationId: request.organizationId,
        action: "update",
        category: "mutation",
        metadata: {
          deletionRequestId: requestId,
          status: "cancelled",
        },
      });

      logger.info("Cancelled deletion request", {
        component: "GdprDeletionService.cancelDeletionRequest",
        userId,
        requestId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to cancel deletion request", {
        component: "GdprDeletionService.cancelDeletionRequest",
        userId,
        requestId,
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to cancel deletion request",
          error as Error,
          "GdprDeletionService.cancelDeletionRequest",
        ),
      );
    }
  }

  /**
   * Get deletion request status for the authenticated user
   */
  static async getDeletionRequestStatus(
    auth: AuthContext,
  ): Promise<ActionResult<UserDeletionRequest | null>> {
    try {
      const request = await UserDeletionRequestsQueries.findByUserId(
        auth.user.id,
      );
      return ok(request);
    } catch (error) {
      logger.error("Failed to get deletion request status", {
        component: "GdprDeletionService.getDeletionRequestStatus",
        error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get deletion request status",
          error as Error,
          "GdprDeletionService.getDeletionRequestStatus",
        ),
      );
    }
  }
}
