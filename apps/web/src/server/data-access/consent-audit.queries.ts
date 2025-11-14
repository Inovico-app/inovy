import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  consentAuditLog,
  type ConsentAuditLog,
  type NewConsentAuditLog,
} from "../db/schema/consent-audit-log";

/**
 * Consent Audit Log Queries
 * Pure data access layer for consent audit operations
 */
export class ConsentAuditQueries {
  /**
   * Create a new audit log entry
   */
  static async createAuditLog(
    data: NewConsentAuditLog
  ): Promise<ConsentAuditLog> {
    const [log] = await db.insert(consentAuditLog).values(data).returning();
    return log;
  }

  /**
   * Get audit logs for a recording
   */
  static async getAuditLogsByRecordingId(
    recordingId: string
  ): Promise<ConsentAuditLog[]> {
    return db
      .select()
      .from(consentAuditLog)
      .where(eq(consentAuditLog.recordingId, recordingId))
      .orderBy(desc(consentAuditLog.createdAt));
  }

  /**
   * Get audit logs for a specific participant
   */
  static async getAuditLogsByParticipant(
    recordingId: string,
    participantEmail: string
  ): Promise<ConsentAuditLog[]> {
    return db
      .select()
      .from(consentAuditLog)
      .where(
        and(
          eq(consentAuditLog.recordingId, recordingId),
          eq(consentAuditLog.participantEmail, participantEmail)
        )
      )
      .orderBy(desc(consentAuditLog.createdAt));
  }
}

