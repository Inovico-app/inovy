import { err, ok } from "neverthrow";
import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
  isActionError,
} from "../../lib/server-action-client/action-errors";
import { ConsentQueries } from "../data-access/consent.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import type {
  ConsentParticipant,
  NewConsentParticipant,
} from "../db/schema/consent";
import { ConsentAuditService } from "./consent-audit.service";

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
      // Enforce explicit consent only for GDPR/HIPAA compliance
      if (consentMethod !== "explicit") {
        return err(
          ActionErrors.validation(
            "Only explicit consent is allowed for GDPR/HIPAA compliance. Implicit and bot-notification consent methods are not permitted.",
            { consentMethod }
          )
        );
      }

      // Verify recording exists and belongs to organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
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

        participant =
          await ConsentQueries.createConsentParticipant(newParticipant);
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
      try {
        await ConsentAuditService.logConsentAction(
          recordingId,
          participantEmail,
          "granted",
          userId,
          null,
          ipAddress,
          userAgent,
          {
            consentMethod,
            participantName,
          },
          organizationId
        );
      } catch (auditError) {
        logger.error(
          "Failed to log consent audit event",
          {
            component: "ConsentService.grantConsent",
            recordingId,
            userId,
          },
          auditError as Error
        );
        // Audit failure doesn't block consent operation, but is logged for monitoring
      }

      logger.info("Consent granted", {
        component: "ConsentService.grantConsent",
        recordingId,
        participantId: participant.id,
        userId,
      });

      return ok(participant);
    } catch (error) {
      // Preserve ActionErrors (e.g., from assertOrganizationAccess)
      if (isActionError(error)) {
        return err(error);
      }

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
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
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
      try {
        await ConsentAuditService.logConsentAction(
          recordingId,
          participantEmail,
          "revoked",
          userId,
          null,
          undefined,
          undefined,
          {}, // createdAt already captures when revocation occurred
          organizationId
        );
      } catch (auditError) {
        logger.error(
          "Failed to log consent audit event",
          {
            component: "ConsentService.revokeConsent",
            recordingId,
            userId,
          },
          auditError as Error
        );
        // Audit failure doesn't block consent operation, but is logged for monitoring
      }

      logger.info("Consent revoked", {
        component: "ConsentService.revokeConsent",
        recordingId,
        participantId: updated.id,
        userId,
      });

      return ok(updated);
    } catch (error) {
      // Preserve ActionErrors (e.g., from assertOrganizationAccess)
      if (isActionError(error)) {
        return err(error);
      }

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
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
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

      const participants =
        await ConsentQueries.getConsentParticipantsByRecordingId(recordingId);

      return ok(participants);
    } catch (error) {
      // Preserve ActionErrors (e.g., from assertOrganizationAccess)
      if (isActionError(error)) {
        return err(error);
      }

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
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
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
      // Preserve ActionErrors (e.g., from assertOrganizationAccess)
      if (isActionError(error)) {
        return err(error);
      }

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

