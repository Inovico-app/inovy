import { err, ok, type Result } from "neverthrow";
import { ActionErrors, type ActionError } from "../../lib/action-errors";
import { logger } from "../../lib/logger";
import {
  insertRecording,
  selectRecordingById,
  selectRecordingsByProjectId,
  updateRecordingMetadata as updateRecordingMetadataQuery,
  getRecordingStatistics as getRecordingStatisticsQuery,
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

