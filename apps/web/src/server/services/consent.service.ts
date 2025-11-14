import { err, ok } from "neverthrow";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { assertOrganizationAccess } from "../../lib/organization-isolation";
import { logger } from "../../lib/logger";
import { ConsentQueries } from "../data-access/consent.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { ConsentAuditService } from "./consent-audit.service";
import type {
  ConsentParticipant,
  NewConsentParticipant,
} from "../db/schema/consent";

/**
 * Consent Service
 * Handles business logic for consent management
 */
export class ConsentService {
  /**
   * Grant consent for a participant
   */
  static async grantConsent(
    recordingId: string,
    participantEmail: string,
    participantName: string | undefined,
    consentMethod: "explicit" | "implicit" | "bot-notification",
    userId: string,
    organizationId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ActionResult<ConsentParticipant>> {
    try {
      // Verify recording exists and belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "ConsentService.grantConsent")
        );
      }

      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "ConsentService.grantConsent"
      );

      // Check if consent already exists
      const existing = await ConsentQueries.getConsentParticipant(
        recordingId,
        participantEmail
      );

      let participant: ConsentParticipant;

      if (existing) {
        // Update existing consent
        const updated = await ConsentQueries.updateConsentStatus(
          recordingId,
          participantEmail,
          "granted"
        );

        if (!updated) {
          return err(
            ActionErrors.internal(
              "Failed to update consent",
              undefined,
              "ConsentService.grantConsent"
            )
          );
        }

        participant = updated;
      } else {
        // Create new consent record
        const newParticipant: NewConsentParticipant = {
          recordingId,
          participantEmail,
          participantName: participantName ?? null,
          consentStatus: "granted",
          consentMethod,
          consentGivenAt: new Date(),
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          userId: userId ?? null,
        };

        participant = await ConsentQueries.createConsentParticipant(
          newParticipant
        );
      }

      // Update recording consent if organizer grants consent
      if (recording.createdById === userId) {
        await ConsentQueries.updateRecordingConsent(
          recordingId,
          true,
          userId,
          new Date()
        );
      }

      // Log audit event
      await ConsentAuditService.logConsentAction(
        recordingId,
        participantEmail,
        "granted",
        userId,
        null, // Email will be fetched if needed
        ipAddress,
        userAgent,
        {
          consentMethod,
          participantName,
        }
      );

      logger.info("Consent granted", {
        component: "ConsentService.grantConsent",
        recordingId,
        participantEmail,
        userId,
      });

      return ok(participant);
    } catch (error) {
      logger.error("Failed to grant consent", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to grant consent",
          error as Error,
          "ConsentService.grantConsent"
        )
      );
    }
  }

  /**
   * Revoke consent for a participant
   */
  static async revokeConsent(
    recordingId: string,
    participantEmail: string,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<ConsentParticipant>> {
    try {
      // Verify recording exists and belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "ConsentService.revokeConsent")
        );
      }

      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "ConsentService.revokeConsent"
      );

      // Update consent status
      const updated = await ConsentQueries.updateConsentStatus(
        recordingId,
        participantEmail,
        "revoked",
        new Date()
      );

      if (!updated) {
        return err(
          ActionErrors.notFound(
            "Consent participant",
            "ConsentService.revokeConsent"
          )
        );
      }

      // Log audit event
      await ConsentAuditService.logConsentAction(
        recordingId,
        participantEmail,
        "revoked",
        userId,
        null, // Email will be fetched if needed
        undefined,
        undefined,
        {
          revokedAt: new Date().toISOString(),
        }
      );

      logger.info("Consent revoked", {
        component: "ConsentService.revokeConsent",
        recordingId,
        participantEmail,
        userId,
      });

      return ok(updated);
    } catch (error) {
      logger.error("Failed to revoke consent", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to revoke consent",
          error as Error,
          "ConsentService.revokeConsent"
        )
      );
    }
  }

  /**
   * Get consent participants for a recording
   */
  static async getConsentParticipants(
    recordingId: string,
    organizationId: string
  ): Promise<ActionResult<ConsentParticipant[]>> {
    try {
      // Verify recording exists and belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "ConsentService.getConsentParticipants"
          )
        );
      }

      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "ConsentService.getConsentParticipants"
      );

      const participants = await ConsentQueries.getConsentParticipantsByRecordingId(
        recordingId
      );

      return ok(participants);
    } catch (error) {
      logger.error("Failed to get consent participants", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get consent participants",
          error as Error,
          "ConsentService.getConsentParticipants"
        )
      );
    }
  }

  /**
   * Get consent statistics for a recording
   */
  static async getConsentStatistics(
    recordingId: string,
    organizationId: string
  ): Promise<
    ActionResult<{
      total: number;
      granted: number;
      pending: number;
      revoked: number;
    }>
  > {
    try {
      // Verify recording exists and belongs to organization
      const recording = await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "ConsentService.getConsentStatistics"
          )
        );
      }

      assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "ConsentService.getConsentStatistics"
      );

      const stats = await ConsentQueries.getConsentStatistics(recordingId);

      return ok(stats);
    } catch (error) {
      logger.error("Failed to get consent statistics", {}, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to get consent statistics",
          error as Error,
          "ConsentService.getConsentStatistics"
        )
      );
    }
  }
}

