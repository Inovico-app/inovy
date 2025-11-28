import { err, ok } from "neverthrow";
import { logger, serializeError } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { RedactionsQueries } from "../data-access/redactions.queries";
import type { NewRedaction, Redaction } from "../db/schema/redactions";
import {
  PIIDetectionService,
  type PIIDetection,
} from "./pii-detection.service";

export interface RedactionInput {
  recordingId: string;
  redactionType: "pii" | "phi" | "custom";
  originalText: string;
  redactedText?: string;
  startTime?: number;
  endTime?: number;
  startIndex?: number;
  endIndex?: number;
  detectedBy?: "automatic" | "manual";
}

export interface BulkRedactionInput {
  recordingId: string;
  redactions: Array<{
    redactionType: "pii" | "phi" | "custom";
    originalText: string;
    redactedText?: string;
    startTime?: number;
    endTime?: number;
    startIndex?: number;
    endIndex?: number;
    detectedBy?: "automatic" | "manual";
  }>;
}

/**
 * Redaction Service
 * Handles business logic for PII/PHI redaction operations
 */
export class RedactionService {
  /**
   * Detect PII in a recording's transcript
   */
  static async detectPII(
    recordingId: string,
    organizationId: string,
    minConfidence: number = 0.5
  ): Promise<ActionResult<PIIDetection[]>> {
    try {
      // Verify organization access
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "RedactionService.detectPII")
        );
      }

      await assertOrganizationAccess(
        recording.organizationId,
        organizationId,
        "RedactionService.detectPII"
      );

      if (!recording.transcriptionText) {
        return ok([]);
      }

      const detections = PIIDetectionService.detectPII(
        recording.transcriptionText,
        minConfidence
      );

      logger.info("PII detection completed", {
        component: "RedactionService.detectPII",
        recordingId,
        detectionsCount: detections.length,
      });

      return ok(detections);
    } catch (error) {
      logger.error("Failed to detect PII", {
        component: "RedactionService.detectPII",
        recordingId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to detect PII",
          error as Error,
          "RedactionService.detectPII"
        )
      );
    }
  }

  /**
   * Create a single redaction
   */
  static async createRedaction(
    input: RedactionInput,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<Redaction>> {
    try {
      // Verify organization access
      const recording = await RecordingsQueries.selectRecordingById(
        input.recordingId
      );
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "RedactionService.createRedaction")
        );
      }

      await assertOrganizationAccess(
        organizationId,
        recording.organizationId,
        "RedactionService.createRedaction"
      );

      const newRedaction: NewRedaction = {
        recordingId: input.recordingId,
        redactionType: input.redactionType,
        originalText: input.originalText,
        redactedText: input.redactedText ?? "[REDACTED]",
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        startIndex: input.startIndex ?? null,
        endIndex: input.endIndex ?? null,
        detectedBy: input.detectedBy ?? "manual",
        redactedBy: userId,
        redactedAt: new Date(),
      };

      const redaction = await RedactionsQueries.createRedaction(newRedaction);

      // Update redacted transcript
      await this.updateRedactedTranscript(
        input.recordingId,
        recording.transcriptionText ?? ""
      );

      logger.info("Redaction created", {
        component: "RedactionService.createRedaction",
        recordingId: input.recordingId,
        redactionId: redaction.id,
      });

      return ok(redaction);
    } catch (error) {
      logger.error("Failed to create redaction", {
        component: "RedactionService.createRedaction",
        recordingId: input.recordingId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to create redaction",
          error as Error,
          "RedactionService.createRedaction"
        )
      );
    }
  }

  /**
   * Create multiple redactions in bulk
   */
  static async createBulkRedactions(
    input: BulkRedactionInput,
    userId: string,
    organizationId: string
  ): Promise<ActionResult<Redaction[]>> {
    try {
      // Verify organization access
      const recording = await RecordingsQueries.selectRecordingById(
        input.recordingId
      );
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "RedactionService.createBulkRedactions"
          )
        );
      }

      await assertOrganizationAccess(
        organizationId,
        recording.organizationId,
        "RedactionService.createBulkRedactions"
      );

      const newRedactions: NewRedaction[] = input.redactions.map((r) => ({
        recordingId: input.recordingId,
        redactionType: r.redactionType,
        originalText: r.originalText,
        redactedText: r.redactedText ?? "[REDACTED]",
        startTime: r.startTime ?? null,
        endTime: r.endTime ?? null,
        startIndex: r.startIndex ?? null,
        endIndex: r.endIndex ?? null,
        detectedBy: r.detectedBy ?? "automatic",
        redactedBy: userId,
        redactedAt: new Date(),
      }));

      const redactions =
        await RedactionsQueries.createRedactions(newRedactions);

      // Update redacted transcript
      await this.updateRedactedTranscript(
        input.recordingId,
        recording.transcriptionText ?? ""
      );

      logger.info("Bulk redactions created", {
        component: "RedactionService.createBulkRedactions",
        recordingId: input.recordingId,
        redactionsCount: redactions.length,
      });

      return ok(redactions);
    } catch (error) {
      logger.error("Failed to create bulk redactions", {
        component: "RedactionService.createBulkRedactions",
        recordingId: input.recordingId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to create bulk redactions",
          error as Error,
          "RedactionService.createBulkRedactions"
        )
      );
    }
  }

  /**
   * Get all redactions for a recording
   */
  static async getRedactions(
    recordingId: string,
    organizationId: string
  ): Promise<ActionResult<Redaction[]>> {
    try {
      // Verify organization access
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "RedactionService.getRedactions")
        );
      }

      await assertOrganizationAccess(
        organizationId,
        recording.organizationId,
        "RedactionService.getRedactions"
      );

      const redactions =
        await RedactionsQueries.getRedactionsByRecordingId(recordingId);

      return ok(redactions);
    } catch (error) {
      logger.error("Failed to get redactions", {
        component: "RedactionService.getRedactions",
        recordingId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to get redactions",
          error as Error,
          "RedactionService.getRedactions"
        )
      );
    }
  }

  /**
   * Delete a redaction
   */
  static async deleteRedaction(
    redactionId: string,
    organizationId: string
  ): Promise<ActionResult<void>> {
    try {
      const redaction = await RedactionsQueries.getRedactionById(redactionId);
      if (!redaction) {
        return err(
          ActionErrors.notFound("Redaction", "RedactionService.deleteRedaction")
        );
      }

      // Verify organization access
      const recording = await RecordingsQueries.selectRecordingById(
        redaction.recordingId
      );
      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "RedactionService.deleteRedaction")
        );
      }

      await assertOrganizationAccess(
        organizationId,
        recording.organizationId,
        "RedactionService.deleteRedaction"
      );

      await RedactionsQueries.deleteRedaction(redactionId);

      // Update redacted transcript
      await this.updateRedactedTranscript(
        redaction.recordingId,
        recording.transcriptionText ?? ""
      );

      logger.info("Redaction deleted", {
        component: "RedactionService.deleteRedaction",
        redactionId,
        recordingId: redaction.recordingId,
      });

      return ok(undefined);
    } catch (error) {
      logger.error("Failed to delete redaction", {
        component: "RedactionService.deleteRedaction",
        redactionId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to delete redaction",
          error as Error,
          "RedactionService.deleteRedaction"
        )
      );
    }
  }

  /**
   * Update redacted transcript based on all redactions
   */
  private static async updateRedactedTranscript(
    recordingId: string,
    originalText: string
  ): Promise<void> {
    try {
      const redactions =
        await RedactionsQueries.getRedactionsByRecordingId(recordingId);

      // Filter redactions that have index information
      const indexedRedactions = redactions.filter(
        (r) => r.startIndex !== null && r.endIndex !== null
      );

      if (indexedRedactions.length === 0) {
        // No redactions with indices, clear redacted text
        await RecordingsQueries.updateRecording(recordingId, {
          redactedTranscriptionText: null,
        });
        return;
      }

      // Apply redactions
      const redactedText = PIIDetectionService.applyRedactions(
        originalText,
        indexedRedactions.map((r) => ({
          startIndex: r.startIndex!,
          endIndex: r.endIndex!,
        }))
      );

      await RecordingsQueries.updateRecording(recordingId, {
        redactedTranscriptionText: redactedText,
      });

      logger.info("Redacted transcript updated", {
        component: "RedactionService.updateRedactedTranscript",
        recordingId,
        redactionsCount: indexedRedactions.length,
      });
    } catch (error) {
      logger.error("Failed to update redacted transcript", {
        component: "RedactionService.updateRedactedTranscript",
        recordingId,
        error: serializeError(error),
      });
      // Don't throw - this is a background operation
    }
  }

  /**
   * Apply automatic PII detection and create redactions
   */
  static async applyAutomaticRedactions(
    recordingId: string,
    userId: string,
    organizationId: string,
    minConfidence: number = 0.5
  ): Promise<ActionResult<Redaction[]>> {
    try {
      const detectionResult = await this.detectPII(
        recordingId,
        organizationId,
        minConfidence
      );

      if (detectionResult.isErr()) {
        return err(detectionResult.error);
      }

      const detections = detectionResult.value;

      if (detections.length === 0) {
        return ok([]);
      }

      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording || !recording.transcriptionText) {
        return ok([]);
      }

      // Convert detections to redactions
      const redactions: Array<{
        redactionType: "pii" | "phi" | "custom";
        originalText: string;
        startIndex: number;
        endIndex: number;
        detectedBy: "automatic";
      }> = detections.map((detection) => ({
        redactionType: "pii",
        originalText: detection.text,
        startIndex: detection.startIndex,
        endIndex: detection.endIndex,
        detectedBy: "automatic",
      }));

      const bulkResult = await this.createBulkRedactions(
        {
          recordingId,
          redactions,
        },
        userId,
        organizationId
      );

      if (bulkResult.isErr()) {
        return err(bulkResult.error);
      }

      return ok(bulkResult.value);
    } catch (error) {
      logger.error("Failed to apply automatic redactions", {
        component: "RedactionService.applyAutomaticRedactions",
        recordingId,
        error: serializeError(error),
      });

      return err(
        ActionErrors.internal(
          "Failed to apply automatic redactions",
          error as Error,
          "RedactionService.applyAutomaticRedactions"
        )
      );
    }
  }
}

