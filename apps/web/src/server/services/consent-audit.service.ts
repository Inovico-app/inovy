import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import { ConsentAuditQueries } from "../data-access/consent-audit.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import type {
  ConsentAuditAction,
  NewConsentAuditLog,
} from "../db/schema/consent-audit-log";

export type ConsentAuditLogRecord = {
  id: string;
  recordingId: string;
  participantEmail: string;
  action: ConsentAuditAction;
  performedBy: string;
  performedByEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

/**
 * Consent Audit Service
 * Handles audit logging for all consent-related actions
 */
export class ConsentAuditService {
  /**
   * Log a consent action
   * Note: Organization verification is non-throwing to prevent audit failures from breaking consent operations
   */
  static async logConsentAction(
    recordingId: string,
    participantEmail: string,
    action: ConsentAuditAction,
    performedBy: string,
    performedByEmail: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    metadata?: Record<string, unknown>,
    organizationId?: string
  ): Promise<void> {
    try {
      // Verify organization access if provided (defense in depth)
      // This is non-throwing to prevent audit failures from breaking consent operations
      if (organizationId) {
        try {
          const recording =
            await RecordingsQueries.selectRecordingById(recordingId);
          if (recording) {
            assertOrganizationAccess(
              recording.organizationId,
              organizationId,
              "ConsentAuditService.logConsentAction"
            );
          }
        } catch (orgError) {
          // Log but don't throw - audit logging shouldn't break the main flow
          logger.warn("Organization verification failed during audit logging", {
            component: "ConsentAuditService.logConsentAction",
            recordingId,
            organizationId,
            action,
            error: orgError,
          });
        }
      }

      const auditLog: NewConsentAuditLog = {
        recordingId,
        participantEmail,
        action,
        performedBy,
        performedByEmail: performedByEmail ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        metadata: metadata ?? null,
      };

      await ConsentAuditQueries.createAuditLog(auditLog);

      logger.info("Consent action logged", {
        component: "ConsentAuditService.logConsentAction",
        recordingId,
        action,
        performedBy,
      });
    } catch (error) {
      // Don't throw - audit logging failures shouldn't break the main flow
      logger.error(
        "Failed to log consent action",
        {
          component: "ConsentAuditService.logConsentAction",
          recordingId,
          action,
          performedBy,
        },
        error as Error
      );
    }
  }

  /**
   * Get audit logs for a recording
   * Verifies organization access to prevent cross-organization data leakage
   */
  static async getAuditLogsByRecordingId(
    recordingId: string,
    organizationId: string
  ): Promise<ConsentAuditLogRecord[]> {
    try {
      // Verify recording exists and belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        logger.warn("Recording not found when fetching audit logs", {
          component: "ConsentAuditService.getAuditLogsByRecordingId",
          recordingId,
          organizationId,
        });
        return [];
      }

      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "ConsentAuditService.getAuditLogsByRecordingId"
      );

      return await ConsentAuditQueries.getAuditLogsByRecordingId(recordingId);
    } catch (error) {
      logger.error(
        "Failed to get consent audit logs",
        {
          component: "ConsentAuditService.getAuditLogsByRecordingId",
          recordingId,
          organizationId,
        },
        error as Error
      );
      return [];
    }
  }

  /**
   * Get audit logs for a participant
   * Verifies organization access to prevent cross-organization data leakage
   */
  static async getAuditLogsByParticipant(
    recordingId: string,
    participantEmail: string,
    organizationId: string
  ): Promise<ConsentAuditLogRecord[]> {
    try {
      // Verify recording exists and belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        logger.warn("Recording not found when fetching audit logs", {
          component: "ConsentAuditService.getAuditLogsByParticipant",
          recordingId,
          organizationId,
        });
        return [];
      }

      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "ConsentAuditService.getAuditLogsByParticipant"
      );

      return await ConsentAuditQueries.getAuditLogsByParticipant(
        recordingId,
        participantEmail
      );
    } catch (error) {
      logger.error(
        "Failed to get consent audit logs",
        {
          component: "ConsentAuditService.getAuditLogsByParticipant",
          recordingId,
          organizationId,
          // Note: participantEmail omitted to avoid logging PII
        },
        error as Error
      );
      return [];
    }
  }
}

