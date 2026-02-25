import { err, ok } from "neverthrow";
import type { BetterAuthUser } from "../../lib/auth";
import { CacheInvalidation } from "../../lib/cache-utils";
import {
  canAccessFullTranscription,
  canAccessSensitiveFields,
} from "../../lib/data-minimization";
import { logger, serializeError } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/rbac/organization-isolation";
import {
  ActionErrors,
  type ActionResult,
} from "../../lib/server-action-client/action-errors";
import { ProjectQueries } from "../data-access/projects.queries";
import { RecordingsQueries } from "../data-access/recordings.queries";
import { type NewRecording, type Recording } from "../db/schema/recordings";
import { type RecordingDto } from "../dto/recording.dto";
import { AuditLogService } from "./audit-log.service";
import { RAGService } from "./rag/rag.service";

/**
 * Recording Service
 * Handles business logic for recording management
 */
export class RecordingService {
  /**
   * Create a new recording
   * If externalRecordingId is provided, checks for existing recording first
   * and returns it if found (idempotency)
   * @param data - Recording data
   * @param invalidateCache - Whether to invalidate cache
   * @param user - Optional user for role-based filtering in response
   */
  static async createRecording(
    data: NewRecording,
    invalidateCache: boolean = true,
    user?: BetterAuthUser
  ): Promise<ActionResult<RecordingDto>> {
    logger.info("Creating new recording", {
      component: "RecordingService.createRecording",
      projectId: data.projectId,
      title: data.title,
      externalRecordingId: data.externalRecordingId,
    });

    try {
      let recording: Recording;

      if (data.externalRecordingId && data.organizationId) {
        const existing = await RecordingsQueries.selectRecordingByExternalId(
          data.externalRecordingId,
          data.organizationId
        );

        if (existing) {
          logger.info("Recording already exists with external ID", {
            component: "RecordingService.createRecording",
            recordingId: existing.id,
            externalRecordingId: data.externalRecordingId,
          });
          recording = existing;
        } else {
          recording = await RecordingsQueries.insertRecording(data);
        }
      } else {
        recording = await RecordingsQueries.insertRecording(data);
      }

      if (invalidateCache) {
        CacheInvalidation.invalidateProjectRecordings(
          recording.projectId,
          recording.organizationId
        );
      }

      logger.info("Successfully created recording", {
        component: "RecordingService.createRecording",
        recordingId: recording.id,
        projectId: recording.projectId,
      });

      return ok(this.toDto(recording, user));
    } catch (error) {
      logger.error("Failed to create recording in database", {
        component: "RecordingService.createRecording",
        error: serializeError(error),
        projectId: data.projectId,
      });

      return err(
        ActionErrors.internal(
          "Failed to create recording",
          error as Error,
          "RecordingService.createRecording"
        )
      );
    }
  }

  /**
   * Get a recording by ID with data minimization
   * @param id - Recording ID
   * @param user - Optional user for role-based filtering
   * @param auditContext - Optional audit context (ipAddress, userAgent)
   */
  static async getRecordingById(
    id: string,
    user?: BetterAuthUser,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<ActionResult<RecordingDto | null>> {
    logger.info("Fetching recording by ID", {
      component: "RecordingService.getRecordingById",
      recordingId: id,
    });

    try {
      const recording = await RecordingsQueries.selectRecordingById(id);

      if (!recording) {
        logger.warn("Recording not found", {
          component: "RecordingService.getRecordingById",
          recordingId: id,
        });
        return ok(null);
      }

      // Audit log when full transcription is accessed by admin
      if (user && recording.transcriptionText) {
        const hasFullAccess = canAccessFullTranscription(user);
        
        if (hasFullAccess) {
          await AuditLogService.createAuditLog({
            eventType: "data_access",
            resourceType: "recording",
            resourceId: id,
            userId: user.id,
            organizationId: recording.organizationId,
            action: "view_full_transcription",
            ipAddress: auditContext?.ipAddress ?? null,
            userAgent: auditContext?.userAgent ?? null,
            metadata: {
              transcriptionLength: recording.transcriptionText?.length ?? 0,
              hasRedaction: !!recording.redactedTranscriptionText,
            },
          });
        }
      }

      return ok(this.toDto(recording, user));
    } catch (error) {
      logger.error("Failed to fetch recording from database", {
        component: "RecordingService.getRecordingById",
        error: serializeError(error),
        recordingId: id,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recording",
          error as Error,
          "RecordingService.getRecordingById"
        )
      );
    }
  }

  /**
   * Get all recordings for a project with data minimization
   * @param projectId - Project ID
   * @param organizationId - Organization ID
   * @param options - Query options
   * @param user - Optional user for role-based filtering
   */
  static async getRecordingsByProjectId(
    projectId: string,
    organizationId: string,
    options?: {
      search?: string;
    },
    user?: BetterAuthUser
  ): Promise<ActionResult<RecordingDto[]>> {
    logger.info("Fetching recordings for project", {
      component: "RecordingService.getRecordingsByProjectId",
      projectId,
      search: options?.search,
    });

    try {
      const project = await ProjectQueries.findById(projectId, organizationId);
      if (!project) {
        return err(
          ActionErrors.notFound(
            "Project",
            "RecordingService.getRecordingsByProjectId"
          )
        );
      }

      const recordings = await RecordingsQueries.selectRecordingsByProjectId(
        projectId,
        organizationId,
        options
      );

      logger.info("Successfully fetched recordings", {
        component: "RecordingService.getRecordingsByProjectId",
        projectId,
        count: recordings.length,
      });

      return ok(recordings.map((recording) => this.toDto(recording, user)));
    } catch (error) {
      logger.error("Failed to fetch recordings from database", {
        component: "RecordingService.getRecordingsByProjectId",
        error: serializeError(error),
        projectId,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recordings",
          error as Error,
          "RecordingService.getRecordingsByProjectId"
        )
      );
    }
  }

  /**
   * Get all recordings for an organization with data minimization
   * @param organizationId - Organization ID
   * @param options - Query options
   * @param user - Optional user for role-based filtering
   */
  static async getRecordingsByOrganization(
    organizationId: string,
    options?: {
      statusFilter?: "active" | "archived";
      search?: string;
      projectIds?: string[];
    },
    user?: BetterAuthUser
  ): Promise<ActionResult<Array<RecordingDto & { projectName: string }>>> {
    logger.info("Fetching recordings for organization", {
      component: "RecordingService.getRecordingsByOrganization",
      organizationId,
      statusFilter: options?.statusFilter,
      search: options?.search,
      projectIds: options?.projectIds,
    });

    try {
      const recordings = await RecordingsQueries.selectRecordingsByOrganization(
        organizationId,
        options
      );

      logger.info("Successfully fetched recordings", {
        component: "RecordingService.getRecordingsByOrganization",
        organizationId,
        count: recordings.length,
      });

      return ok(
        recordings.map((recording) => {
          const { projectName, ...recordingWithoutProjectName } = recording;
          return {
            ...this.toDto(recordingWithoutProjectName as Recording, user),
            projectName,
          };
        })
      );
    } catch (error) {
      logger.error("Failed to fetch recordings from database", {
        component: "RecordingService.getRecordingsByOrganization",
        error: serializeError(error),
        organizationId,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recordings",
          error as Error,
          "RecordingService.getRecordingsByOrganization"
        )
      );
    }
  }

  /**
   * Update recording metadata
   * @param id - Recording ID
   * @param organizationId - Organization ID
   * @param data - Metadata to update
   * @param user - Optional user for role-based filtering in response
   */
  static async updateRecordingMetadata(
    id: string,
    organizationId: string,
    data: {
      title: string;
      description?: string | null;
      recordingDate: Date;
    },
    user?: BetterAuthUser
  ): Promise<ActionResult<RecordingDto>> {
    logger.info("Updating recording metadata", {
      component: "RecordingService.updateRecordingMetadata",
      recordingId: id,
    });

    try {
      const recording = await RecordingsQueries.selectRecordingById(id);

      if (!recording) {
        logger.warn("Recording not found", {
          component: "RecordingService.updateRecordingMetadata",
          recordingId: id,
        });

        return err(
          ActionErrors.notFound(
            "Recording",
            "RecordingService.updateRecordingMetadata"
          )
        );
      }

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "RecordingService.updateRecordingMetadata"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "RecordingService.updateRecordingMetadata"
          )
        );
      }

      const updatedRecording = await RecordingsQueries.updateRecordingMetadata(
        id,
        data
      );

      if (!updatedRecording) {
        return err(
          ActionErrors.internal(
            "Failed to update recording",
            undefined,
            "RecordingService.updateRecordingMetadata"
          )
        );
      }

      CacheInvalidation.invalidateRecording(
        id,
        updatedRecording.projectId,
        organizationId
      );

      logger.info("Successfully updated recording metadata", {
        component: "RecordingService.updateRecordingMetadata",
        recordingId: id,
      });

      return ok(this.toDto(updatedRecording, user));
    } catch (error) {
      logger.error("Failed to update recording in database", {
        component: "RecordingService.updateRecordingMetadata",
        error: serializeError(error),
        recordingId: id,
      });

      return err(
        ActionErrors.internal(
          "Failed to update recording",
          error as Error,
          "RecordingService.updateRecordingMetadata"
        )
      );
    }
  }

  /**
   * Get recording statistics for a project
   */
  static async getProjectRecordingStatistics(projectId: string): Promise<
    ActionResult<{
      totalCount: number;
      lastRecordingDate: Date | null;
      recentCount: number;
    }>
  > {
    logger.info("Getting recording statistics", {
      component: "RecordingService.getProjectRecordingStatistics",
      projectId,
    });

    try {
      const stats = await RecordingsQueries.getRecordingStatistics(projectId);
      return ok(stats);
    } catch (error) {
      logger.error("Failed to get recording statistics", {
        component: "RecordingService.getProjectRecordingStatistics",
        error: serializeError(error),
        projectId,
      });

      return err(
        ActionErrors.internal(
          "Failed to get recording statistics",
          error as Error,
          "RecordingService.getProjectRecordingStatistics"
        )
      );
    }
  }

  /**
   * Archive a recording (soft delete)
   */
  static async archiveRecording(
    recordingId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    logger.info("Archiving recording", {
      component: "RecordingService.archiveRecording",
      recordingId,
    });

    try {
      // Get recording first to know its projectId
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "RecordingService.archiveRecording"
          )
        );
      }

      const result = await RecordingsQueries.archiveRecording(
        recordingId,
        orgCode
      );

      if (result) {
        // Invalidate cache for this recording
        CacheInvalidation.invalidateRecording(
          recordingId,
          recording.projectId,
          orgCode
        );

        logger.info("Successfully archived recording", {
          component: "RecordingService.archiveRecording",
          recordingId,
        });
      }

      return ok(result);
    } catch (error) {
      logger.error("Failed to archive recording", {
        component: "RecordingService.archiveRecording",
        error: serializeError(error),
        recordingId,
      });
      return err(
        ActionErrors.internal(
          "Failed to archive recording",
          error as Error,
          "RecordingService.archiveRecording"
        )
      );
    }
  }

  /**
   * Unarchive a recording
   */
  static async unarchiveRecording(
    recordingId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    logger.info("Unarchiving recording", {
      component: "RecordingService.unarchiveRecording",
      recordingId,
    });

    try {
      // Get recording first to know its projectId
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);
      if (!recording) {
        return err(
          ActionErrors.notFound(
            "Recording",
            "RecordingService.unarchiveRecording"
          )
        );
      }

      const result = await RecordingsQueries.unarchiveRecording(
        recordingId,
        orgCode
      );

      if (result) {
        // Invalidate cache for this recording
        CacheInvalidation.invalidateRecording(
          recordingId,
          recording.projectId,
          orgCode
        );

        logger.info("Successfully unarchived recording", {
          component: "RecordingService.unarchiveRecording",
          recordingId,
        });
      }

      return ok(result);
    } catch (error) {
      logger.error("Failed to unarchive recording", {
        component: "RecordingService.unarchiveRecording",
        error: serializeError(error),
        recordingId,
      });
      return err(
        ActionErrors.internal(
          "Failed to unarchive recording",
          error as Error,
          "RecordingService.unarchiveRecording"
        )
      );
    }
  }

  /**
   * Delete a recording (hard delete)
   */
  static async deleteRecording(
    recordingId: string,
    orgCode: string
  ): Promise<ActionResult<boolean>> {
    logger.info("Deleting recording", {
      component: "RecordingService.deleteRecording",
      recordingId,
    });

    try {
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);

      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "RecordingService.deleteRecording")
        );
      }

      // Use centralized organization isolation check
      try {
        assertOrganizationAccess(
          recording.organizationId,
          orgCode,
          "RecordingService.deleteRecording"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "RecordingService.deleteRecording"
          )
        );
      }

      const deleteResult = await RecordingsQueries.deleteRecording(
        recordingId,
        orgCode
      );

      if (!deleteResult) {
        return err(
          ActionErrors.internal(
            "Failed to delete recording from database",
            undefined,
            "RecordingService.deleteRecording"
          )
        );
      }

      // Invalidate cache for this recording
      CacheInvalidation.invalidateRecording(
        recordingId,
        recording.projectId,
        orgCode
      );

      logger.info("Successfully deleted recording", {
        component: "RecordingService.deleteRecording",
        recordingId,
      });

      return ok(true);
    } catch (error) {
      logger.error("Failed to delete recording", {
        component: "RecordingService.deleteRecording",
        error: serializeError(error),
        recordingId,
      });
      return err(
        ActionErrors.internal(
          "Failed to delete recording",
          error as Error,
          "RecordingService.deleteRecording"
        )
      );
    }
  }

  /**
   * Move a recording to another project
   */
  static async moveRecording(
    recordingId: string,
    targetProjectId: string,
    organizationId: string,
    userId: string
  ): Promise<ActionResult<RecordingDto>> {
    logger.info("Moving recording to another project", {
      component: "RecordingService.moveRecording",
      recordingId,
      targetProjectId,
      userId,
    });

    try {
      // Get the recording and verify it belongs to the organization
      const recording =
        await RecordingsQueries.selectRecordingById(recordingId);

      if (!recording) {
        logger.warn("Recording not found", {
          component: "RecordingService.moveRecording",
          recordingId,
        });

        return err(
          ActionErrors.notFound("Recording", "RecordingService.moveRecording")
        );
      }

      // Use centralized organization isolation check
      try {
        assertOrganizationAccess(
          recording.organizationId,
          organizationId,
          "RecordingService.moveRecording"
        );
      } catch {
        return err(
          ActionErrors.notFound(
            "Recording not found",
            "RecordingService.moveRecording"
          )
        );
      }

      // Verify target project belongs to same organization
      const targetProject = await ProjectQueries.findById(
        targetProjectId,
        organizationId
      );

      if (!targetProject) {
        logger.warn(
          "Target project not found or doesn't belong to organization",
          {
            component: "RecordingService.moveRecording",
            targetProjectId,
            organizationId,
          }
        );

        return err(
          ActionErrors.notFound(
            "Target project",
            "RecordingService.moveRecording"
          )
        );
      }

      // Store source project ID for cache invalidation
      const sourceProjectId = recording.projectId;

      // Use database transaction to update both recordings and embeddings atomically
      const movedRecording = await RecordingsQueries.moveRecordingToProject(
        recordingId,
        targetProjectId,
        organizationId
      );

      if (!movedRecording) {
        return err(
          ActionErrors.internal(
            "Failed to move recording",
            undefined,
            "RecordingService.moveRecording"
          )
        );
      }

      // Update embeddings project in Qdrant
      const ragService = new RAGService();
      const updateResult = await ragService.updateProjectId(
        recordingId,
        "transcription", // Update transcription embeddings
        targetProjectId
      );
      if (updateResult.isErr()) {
        logger.warn("Failed to update embeddings project", {
          recordingId,
          error: updateResult.error,
        });
        // Continue even if update fails - non-critical
      }

      // Invalidate cache for both source and target projects
      CacheInvalidation.invalidateProjectRecordings(
        sourceProjectId,
        organizationId
      );
      CacheInvalidation.invalidateProjectRecordings(
        targetProjectId,
        organizationId
      );
      CacheInvalidation.invalidateRecording(
        recordingId,
        targetProjectId,
        organizationId
      );

      logger.info("Successfully moved recording", {
        component: "RecordingService.moveRecording",
        recordingId,
        sourceProjectId,
        targetProjectId,
        userId,
      });

      return ok(this.toDto(movedRecording));
    } catch (error) {
      logger.error("Failed to move recording", {
        component: "RecordingService.moveRecording",
        error: serializeError(error),
        recordingId,
        targetProjectId,
      });

      return err(
        ActionErrors.internal(
          "Failed to move recording",
          error as Error,
          "RecordingService.moveRecording"
        )
      );
    }
  }

  /**
   * Get a recording with full transcription for admin users only
   * Includes comprehensive audit logging
   * @param id - Recording ID
   * @param user - User requesting access
   * @param auditContext - Audit context (ipAddress, userAgent)
   */
  static async getRecordingWithFullTranscription(
    id: string,
    user: BetterAuthUser,
    auditContext: { ipAddress?: string; userAgent?: string }
  ): Promise<ActionResult<RecordingDto | null>> {
    if (!canAccessFullTranscription(user)) {
      logger.security.unauthorizedAccess({
        userId: user.id,
        resource: "recording_full_transcription",
        action: "view",
        reason: `User role ${user.role} does not have access to full transcriptions`,
      });

      return err(
        ActionErrors.forbidden(
          "Access denied: insufficient permissions to view full transcription",
          { resourceId: id, userRole: user.role },
          "RecordingService.getRecordingWithFullTranscription"
        )
      );
    }

    return this.getRecordingById(id, user, auditContext);
  }

  /**
   * Convert database recording to DTO with role-based data minimization
   * 
   * Data Minimization (SSD-4.4.01):
   * - When user is provided: Non-admin users receive only redactedTranscriptionText
   * - When user is provided: Admin users receive both transcriptionText and redactedTranscriptionText
   * - When user is NOT provided: Full data returned (for internal operations)
   * - Sensitive fields (workflowError, encryptionMetadata) filtered for non-admins
   * 
   * @param recording - Database recording object
   * @param user - Optional user for role-based filtering. If not provided, returns full data.
   */
  private static toDto(
    recording: Recording,
    user?: BetterAuthUser
  ): RecordingDto {
    // If no user provided, return full data (internal operation)
    // If user provided, apply role-based filtering
    const hasFullAccess = user ? canAccessFullTranscription(user) : true;
    const hasSensitiveAccess = user ? canAccessSensitiveFields(user) : true;

    const dto: RecordingDto = {
      id: recording.id,
      projectId: recording.projectId,
      title: recording.title,
      description: recording.description,
      fileUrl: recording.fileUrl,
      fileName: recording.fileName,
      fileSize: recording.fileSize,
      fileMimeType: recording.fileMimeType,
      duration: recording.duration,
      recordingDate: recording.recordingDate,
      recordingMode: recording.recordingMode,
      transcriptionStatus: recording.transcriptionStatus,
      redactedTranscriptionText: recording.redactedTranscriptionText ?? null,
      isTranscriptionManuallyEdited: recording.isTranscriptionManuallyEdited,
      transcriptionLastEditedById: recording.transcriptionLastEditedById,
      transcriptionLastEditedAt: recording.transcriptionLastEditedAt,
      status: recording.status,
      workflowStatus: recording.workflowStatus,
      workflowRetryCount: recording.workflowRetryCount,
      lastReprocessedAt: recording.lastReprocessedAt,
      reprocessingTriggeredById: recording.reprocessingTriggeredById,
      organizationId: recording.organizationId,
      createdById: recording.createdById,
      consentGiven: recording.consentGiven,
      consentGivenBy: recording.consentGivenBy,
      consentGivenAt: recording.consentGivenAt,
      consentRevokedAt: recording.consentRevokedAt,
      isEncrypted: recording.isEncrypted ?? false,
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    };

    // Include full transcription only for admin users or internal operations
    if (hasFullAccess) {
      dto.transcriptionText = recording.transcriptionText;
    }

    // Include sensitive fields only for admin users or internal operations
    if (hasSensitiveAccess) {
      dto.workflowError = recording.workflowError;
      dto.encryptionMetadata = recording.encryptionMetadata ?? null;
    }

    return dto;
  }
}

