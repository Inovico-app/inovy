import { and, eq, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  consentParticipants,
  recordings,
  type ConsentParticipant,
  type NewConsentParticipant,
} from "../db/schema";

/**
 * Consent Participants Queries
 * Pure data access layer for consent operations
 */
export class ConsentQueries {
  /**
   * Create a new consent participant record
   */
  static async createConsentParticipant(
    data: NewConsentParticipant
  ): Promise<ConsentParticipant> {
    const [participant] = await db
      .insert(consentParticipants)
      .values({
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return participant;
  }

  /**
   * Get consent participant by recording ID and email
   */
  static async getConsentParticipant(
    recordingId: string,
    participantEmail: string
  ): Promise<ConsentParticipant | null> {
    const [participant] = await db
      .select()
      .from(consentParticipants)
      .where(
        and(
          eq(consentParticipants.recordingId, recordingId),
          eq(consentParticipants.participantEmail, participantEmail)
        )
      )
      .limit(1);

    return participant ?? null;
  }

  /**
   * Get all consent participants for a recording
   */
  static async getConsentParticipantsByRecordingId(
    recordingId: string
  ): Promise<ConsentParticipant[]> {
    return db
      .select()
      .from(consentParticipants)
      .where(eq(consentParticipants.recordingId, recordingId))
      .orderBy(desc(consentParticipants.createdAt));
  }

  /**
   * Update consent status for a participant
   */
  static async updateConsentStatus(
    recordingId: string,
    participantEmail: string,
    status: "pending" | "granted" | "revoked" | "expired",
    revokedAt?: Date
  ): Promise<ConsentParticipant | null> {
    const updateData: Partial<ConsentParticipant> = {
      consentStatus: status,
      updatedAt: new Date(),
    };

    if (status === "granted") {
      updateData.consentGivenAt = new Date();
    } else if (status === "revoked" && revokedAt) {
      updateData.consentRevokedAt = revokedAt;
    }

    const [updated] = await db
      .update(consentParticipants)
      .set(updateData)
      .where(
        and(
          eq(consentParticipants.recordingId, recordingId),
          eq(consentParticipants.participantEmail, participantEmail)
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Update recording consent fields
   */
  static async updateRecordingConsent(
    recordingId: string,
    consentGiven: boolean,
    consentGivenBy: string,
    consentGivenAt?: Date,
    consentRevokedAt?: Date
  ): Promise<void> {
    await db
      .update(recordings)
      .set({
        consentGiven,
        consentGivenBy,
        consentGivenAt: consentGiven
          ? consentGivenAt ?? new Date()
          : null,
        consentRevokedAt,
        updatedAt: new Date(),
      })
      .where(eq(recordings.id, recordingId));
  }

  /**
   * Get consent statistics for a recording
   */
  static async getConsentStatistics(recordingId: string): Promise<{
    total: number;
    granted: number;
    pending: number;
    revoked: number;
  }> {
    const participants = await this.getConsentParticipantsByRecordingId(
      recordingId
    );

    return {
      total: participants.length,
      granted: participants.filter((p) => p.consentStatus === "granted").length,
      pending: participants.filter((p) => p.consentStatus === "pending").length,
      revoked: participants.filter((p) => p.consentStatus === "revoked").length,
    };
  }

  /**
   * Find consent participants by user ID
   */
  static async findByUserId(userId: string): Promise<ConsentParticipant[]> {
    return db
      .select()
      .from(consentParticipants)
      .where(eq(consentParticipants.userId, userId));
  }

  /**
   * Anonymize consent participants for given recording IDs
   */
  static async anonymizeByRecordingIds(
    recordingIds: string[],
    anonymizedEmail: string,
    anonymizedName: string
  ): Promise<void> {
    if (recordingIds.length === 0) return;

    await db
      .update(consentParticipants)
      .set({
        participantEmail: anonymizedEmail,
        participantName: anonymizedName,
        userId: null,
        updatedAt: new Date(),
      })
      .where(inArray(consentParticipants.recordingId, recordingIds));
  }
}

