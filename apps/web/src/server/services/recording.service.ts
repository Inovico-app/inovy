import { err, ok, type Result } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import {
  insertRecording,
  selectRecordingById,
  selectRecordingsByProjectId,
  updateRecordingMetadata as updateRecordingMetadataQuery,
  getRecordingStatistics as getRecordingStatisticsQuery,
  RecordingsQueries,
} from "../data-access/recordings.queries";
import type { NewRecording, Recording } from "../db/schema";
import { type RecordingDto } from "../dto";

/**
 * Recording Service
 * Handles business logic for recording management
 */
export class RecordingService {
  /**
   * Create a new recording
   */
  static async createRecording(
    data: NewRecording
  ): Promise<Result<RecordingDto, ActionError>> {
    logger.info("Creating new recording", {
      component: "RecordingService.createRecording",
      projectId: data.projectId,
      title: data.title,
    });

    const result = await insertRecording(data);

    if (result.isErr()) {
      logger.error("Failed to create recording in database", {
        component: "RecordingService.createRecording",
        error: result.error,
        projectId: data.projectId,
      });

      return err(
        ActionErrors.internal(
          "Failed to create recording",
          new Error(result.error),
          "RecordingService.createRecording"
        )
      );
    }

    const recording = result.value;

    logger.info("Successfully created recording", {
      component: "RecordingService.createRecording",
      recordingId: recording.id,
      projectId: recording.projectId,
    });

    return ok(this.toDto(recording));
  }

  /**
   * Get a recording by ID
   */
  static async getRecordingById(
    id: string
  ): Promise<Result<RecordingDto | null, ActionError>> {
    logger.info("Fetching recording by ID", {
      component: "RecordingService.getRecordingById",
      recordingId: id,
    });

    const result = await selectRecordingById(id);

    if (result.isErr()) {
      logger.error("Failed to fetch recording from database", {
        component: "RecordingService.getRecordingById",
        error: result.error,
        recordingId: id,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recording",
          new Error(result.error),
          "RecordingService.getRecordingById"
        )
      );
    }

    const recording = result.value;

    if (!recording) {
      logger.warn("Recording not found", {
        component: "RecordingService.getRecordingById",
        recordingId: id,
      });
      return ok(null);
    }

    return ok(this.toDto(recording));
  }

  /**
   * Get all recordings for a project
   * Returns recordings ordered by creation date (newest first)
   */
  static async getRecordingsByProjectId(
    projectId: string,
    options?: {
      search?: string;
    }
  ): Promise<Result<RecordingDto[], ActionError>> {
    logger.info("Fetching recordings for project", {
      component: "RecordingService.getRecordingsByProjectId",
      projectId,
      search: options?.search,
    });

    const result = await selectRecordingsByProjectId(projectId, options);

    if (result.isErr()) {
      logger.error("Failed to fetch recordings from database", {
        component: "RecordingService.getRecordingsByProjectId",
        error: result.error,
        projectId,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recordings",
          new Error(result.error),
          "RecordingService.getRecordingsByProjectId"
        )
      );
    }

    const recordings = result.value;

    logger.info("Successfully fetched recordings", {
      component: "RecordingService.getRecordingsByProjectId",
      projectId,
      count: recordings.length,
    });

    return ok(recordings.map((recording) => this.toDto(recording)));
  }

  /**
   * Update recording metadata
   * Verifies recording belongs to user's organization
   */
  static async updateRecordingMetadata(
    id: string,
    organizationId: string,
    data: {
      title: string;
      description?: string | null;
      recordingDate: Date;
    }
  ): Promise<Result<RecordingDto, ActionError>> {
    logger.info("Updating recording metadata", {
      component: "RecordingService.updateRecordingMetadata",
      recordingId: id,
    });

    // First, fetch the recording to verify ownership
    const recordingResult = await selectRecordingById(id);

    if (recordingResult.isErr()) {
      logger.error("Failed to fetch recording", {
        component: "RecordingService.updateRecordingMetadata",
        error: recordingResult.error,
        recordingId: id,
      });

      return err(
        ActionErrors.internal(
          "Failed to fetch recording",
          new Error(recordingResult.error),
          "RecordingService.updateRecordingMetadata"
        )
      );
    }

    const recording = recordingResult.value;

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

    // Verify recording belongs to the user's organization
    if (recording.organizationId !== organizationId) {
      logger.warn(
        "User attempted to update recording from different organization",
        {
          component: "RecordingService.updateRecordingMetadata",
          recordingId: id,
          userOrgId: organizationId,
          recordingOrgId: recording.organizationId,
        }
      );

      return err(
        ActionErrors.forbidden(
          "You don't have permission to update this recording",
          {
            recordingId: id,
          },
          "RecordingService.updateRecordingMetadata"
        )
      );
    }

    // Update the recording
    const updateResult = await updateRecordingMetadataQuery(id, data);

    if (updateResult.isErr()) {
      logger.error("Failed to update recording in database", {
        component: "RecordingService.updateRecordingMetadata",
        error: updateResult.error,
        recordingId: id,
      });

      return err(
        ActionErrors.internal(
          "Failed to update recording",
          new Error(updateResult.error),
          "RecordingService.updateRecordingMetadata"
        )
      );
    }

    const updatedRecording = updateResult.value;

    logger.info("Successfully updated recording metadata", {
      component: "RecordingService.updateRecordingMetadata",
      recordingId: id,
    });

    return ok(this.toDto(updatedRecording));
  }

  /**
   * Get recording statistics for a project
   */
  static async getProjectRecordingStatistics(projectId: string): Promise<
    Result<
      {
        totalCount: number;
        lastRecordingDate: Date | null;
        recentCount: number;
      },
      string
    >
  > {
    logger.info("Getting recording statistics", {
      component: "RecordingService.getProjectRecordingStatistics",
      projectId,
    });

    const result = await getRecordingStatisticsQuery(projectId);

    if (result.isErr()) {
      logger.error("Failed to get recording statistics", {
        component: "RecordingService.getProjectRecordingStatistics",
        error: result.error,
        projectId,
      });

      return err(result.error);
    }

    return ok(result.value);
  }

  /**
   * Archive a recording (soft delete)
   */
  static async archiveRecording(
    recordingId: string,
    orgCode: string
  ): Promise<Result<boolean, string>> {
    logger.info("Archiving recording", {
      component: "RecordingService.archiveRecording",
      recordingId,
    });

    try {
      const result = await RecordingsQueries.archiveRecording(
        recordingId,
        orgCode
      );

      if (result) {
        logger.info("Successfully archived recording", {
          component: "RecordingService.archiveRecording",
          recordingId,
        });
      }

      return ok(result);
    } catch (error) {
      logger.error("Failed to archive recording", {
        component: "RecordingService.archiveRecording",
        error,
        recordingId,
      });
      return err("Failed to archive recording");
    }
  }

  /**
   * Unarchive a recording
   */
  static async unarchiveRecording(
    recordingId: string,
    orgCode: string
  ): Promise<Result<boolean, string>> {
    logger.info("Unarchiving recording", {
      component: "RecordingService.unarchiveRecording",
      recordingId,
    });

    try {
      const result = await RecordingsQueries.unarchiveRecording(
        recordingId,
        orgCode
      );

      if (result) {
        logger.info("Successfully unarchived recording", {
          component: "RecordingService.unarchiveRecording",
          recordingId,
        });
      }

      return ok(result);
    } catch (error) {
      logger.error("Failed to unarchive recording", {
        component: "RecordingService.unarchiveRecording",
        error,
        recordingId,
      });
      return err("Failed to unarchive recording");
    }
  }

  /**
   * Delete a recording (hard delete with blob cleanup)
   */
  static async deleteRecording(
    recordingId: string,
    orgCode: string
  ): Promise<Result<boolean, ActionError>> {
    logger.info("Deleting recording", {
      component: "RecordingService.deleteRecording",
      recordingId,
    });

    try {
      // First, get the recording to retrieve the blob URL
      const recordingResult = await selectRecordingById(recordingId);

      if (recordingResult.isErr()) {
        return err(
          ActionErrors.internal(
            "Failed to fetch recording",
            new Error(recordingResult.error),
            "RecordingService.deleteRecording"
          )
        );
      }

      const recording = recordingResult.value;

      if (!recording) {
        return err(
          ActionErrors.notFound("Recording", "RecordingService.deleteRecording")
        );
      }

      // Verify ownership
      if (recording.organizationId !== orgCode) {
        return err(
          ActionErrors.forbidden(
            "You don't have permission to delete this recording",
            { recordingId },
            "RecordingService.deleteRecording"
          )
        );
      }

      // Delete the recording from database (this will cascade to related records)
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

      logger.info("Successfully deleted recording", {
        component: "RecordingService.deleteRecording",
        recordingId,
      });

      return ok(true);
    } catch (error) {
      logger.error("Failed to delete recording", {
        component: "RecordingService.deleteRecording",
        error,
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
   * Convert database recording to DTO
   */
  private static toDto(recording: Recording): RecordingDto {
    return {
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
      transcriptionStatus: recording.transcriptionStatus,
      transcriptionText: recording.transcriptionText,
      organizationId: recording.organizationId,
      createdById: recording.createdById,
      createdAt: recording.createdAt,
      updatedAt: recording.updatedAt,
    };
  }
}

