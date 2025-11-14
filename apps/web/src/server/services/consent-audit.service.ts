import { logger } from "../../lib/logger";
import { ConsentAuditQueries } from "../data-access/consent-audit.queries";
import type {
  ConsentAuditAction,
  NewConsentAuditLog,
} from "../db/schema/consent-audit-log";

/**
 * Consent Audit Service
 * Handles audit logging for all consent-related actions
 */
export class ConsentAuditService {
  /**
   * Log a consent action
   */
  static async logConsentAction(
    recordingId: string,
    participantEmail: string,
    action: ConsentAuditAction,
    performedBy: string,
    performedByEmail: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
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
        participantEmail,
        action,
        performedBy,
      });
    } catch (error) {
      // Don't throw - audit logging failures shouldn't break the main flow
      logger.error("Failed to log consent action", {}, error as Error);
    }
  }

  /**
   * Get audit logs for a recording
   */
  static async getAuditLogsByRecordingId(
    recordingId: string
  ): Promise<Array<{
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
  }>> {
    try {
      return await ConsentAuditQueries.getAuditLogsByRecordingId(recordingId);
    } catch (error) {
      logger.error("Failed to get consent audit logs", {}, error as Error);
      return [];
    }
  }

  /**
   * Get audit logs for a participant
   */
  static async getAuditLogsByParticipant(
    recordingId: string,
    participantEmail: string
  ): Promise<Array<{
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
  }>> {
    try {
      return await ConsentAuditQueries.getAuditLogsByParticipant(
        recordingId,
        participantEmail
      );
    } catch (error) {
      logger.error("Failed to get consent audit logs", {}, error as Error);
      return [];
    }
  }
}

