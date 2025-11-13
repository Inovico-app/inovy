import { err, ok } from "neverthrow";
import { start } from "workflow/api";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { isAudioOrVideoFile, uploadToBlob } from "../../lib/google-drive-utils";
import { logger } from "../../lib/logger";
import { convertRecordingIntoAiInsights } from "../../workflows/convert-recording";
import { DriveWatchesQueries } from "../data-access/drive-watches.queries";
import { ProjectQueries } from "../data-access/projects.queries";
import type { DriveWatch, NewRecording } from "../db/schema";
import {
  type DriveWatchDto,
  type DriveWatchListItemDto,
} from "../dto/drive-watch.dto";
import { GoogleDriveService } from "./google-drive.service";
import { RecordingService } from "./recording.service";

/**
 * Drive Watches Service
 * Business logic for Google Drive watch management
 */
export class DriveWatchesService {
  /**
   * Start watching a Drive folder
   * Orchestrates watch creation: checks for existing watch, deactivates expired ones,
   * creates new watch via Google Drive API, and saves to database
   */
  static async startWatch(
    userId: string,
    folderId: string,
    projectId: string,
    organizationId: string,
    webhookUrl: string
  ): Promise<ActionResult<DriveWatchDto>> {
    try {
      logger.info("Starting Drive watch", {
        component: "DriveWatchesService.startWatch",
        userId,
        folderId,
        projectId,
        organizationId,
      });

      // Verify project belongs to organization
      const project = await ProjectQueries.findById(projectId, organizationId);
      if (!project) {
        return err(
          ActionErrors.notFound("Project", "DriveWatchesService.startWatch")
        );
      }

      // Get folder name from Drive API
      const folderNameResult = await GoogleDriveService.getFileMetadata(
        userId,
        folderId
      );
      const folderName = folderNameResult.isOk()
        ? folderNameResult.value.name
        : null;

      // Check for existing active watch
      const existingWatch = await DriveWatchesQueries.getWatchByUserAndFolder(
        userId,
        folderId
      );

      if (!existingWatch) {
        // Create new watch via Google Drive API
        const watchResult = await GoogleDriveService.startWatch(
          userId,
          folderId,
          webhookUrl
        );

        if (watchResult.isErr()) {
          return err(watchResult.error);
        }

        const { channelId, resourceId, expiration } = watchResult.value;

        // Save to database
        const watch = await DriveWatchesQueries.createWatch({
          userId,
          folderId,
          channelId,
          resourceId,
          expiration,
          isActive: true,
          projectId,
          organizationId,
        });

        logger.info("Successfully started Drive watch", {
          component: "DriveWatchesService.startWatch",
          watchId: watch.id,
          folderId,
          projectId,
        });

        return ok({
          id: watch.id,
          folderId: watch.folderId,
          projectId: watch.projectId,
          organizationId: watch.organizationId,
          expiresAt: new Date(watch.expiration),
          isActive: watch.isActive,
          folderName,
        });
      }

      // If watch exists and is not expired, return it
      if (
        existingWatch &&
        existingWatch.expiration > Date.now() &&
        existingWatch.isActive
      ) {
        if (existingWatch.projectId !== projectId) {
          return err(
            ActionErrors.conflict(
              "Drive watch already exists for this folder under a different project",
              "DriveWatchesService.startWatch"
            )
          );
        }

        logger.info("Active watch already exists", {
          component: "DriveWatchesService.startWatch",
          watchId: existingWatch.id,
          folderId,
        });
      }

      // Deactivate expired watch
      if (
        existingWatch &&
        existingWatch.expiration < Date.now() &&
        existingWatch.isActive
      ) {
        await DriveWatchesQueries.deactivateWatch(existingWatch.channelId);
        logger.info("Deactivated expired watch", {
          component: "DriveWatchesService.startWatch",
          watchId: existingWatch.id,
        });

        // Create new watch since the old one was expired
        const watchResult = await GoogleDriveService.startWatch(
          userId,
          folderId,
          webhookUrl
        );

        if (watchResult.isErr()) {
          return err(watchResult.error);
        }

        const { channelId, resourceId, expiration } = watchResult.value;

        const watch = await DriveWatchesQueries.createWatch({
          userId,
          folderId,
          channelId,
          resourceId,
          expiration,
          isActive: true,
          projectId,
          organizationId,
        });

        logger.info("Successfully started Drive watch after deactivating expired watch", {
          component: "DriveWatchesService.startWatch",
          watchId: watch.id,
          folderId,
          projectId,
        });

        return ok({
          id: watch.id,
          folderId: watch.folderId,
          projectId: watch.projectId,
          organizationId: watch.organizationId,
          expiresAt: new Date(watch.expiration),
          isActive: watch.isActive,
          folderName,
        });
      }

      return ok({
        id: existingWatch.id,
        folderId: existingWatch.folderId,
        projectId: existingWatch.projectId,
        organizationId: existingWatch.organizationId,
        expiresAt: new Date(existingWatch.expiration),
        isActive: existingWatch.isActive,
        folderName,
      });
    } catch (error) {
      logger.error(
        "Failed to start Drive watch",
        { userId, folderId, projectId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to start Drive watch",
          error as Error,
          "DriveWatchesService.startWatch"
        )
      );
    }
  }

  /**
   * Stop watching a Drive folder
   * Stops watch subscription via Google Drive API and deactivates in database
   */
  static async stopWatch(
    userId: string,
    folderId: string
  ): Promise<ActionResult<boolean>> {
    try {
      logger.info("Stopping Drive watch", {
        component: "DriveWatchesService.stopWatch",
        userId,
        folderId,
      });

      // Get active watch
      const watch = await DriveWatchesQueries.getWatchByUserAndFolder(
        userId,
        folderId
      );

      if (!watch) {
        return err(
          ActionErrors.notFound("Drive watch", "DriveWatchesService.stopWatch")
        );
      }

      // Stop watch via Google Drive API
      const stopResult = await GoogleDriveService.stopWatch(
        userId,
        watch.channelId,
        watch.resourceId
      );

      if (stopResult.isErr()) {
        // Log error but still deactivate in database
        logger.warn("Failed to stop watch via Drive API, deactivating anyway", {
          component: "DriveWatchesService.stopWatch",
          watchId: watch.id,
          error: stopResult.error,
        });
      }

      // Deactivate in database
      await DriveWatchesQueries.deactivateWatch(watch.channelId);

      logger.info("Successfully stopped Drive watch", {
        component: "DriveWatchesService.stopWatch",
        watchId: watch.id,
        folderId,
      });

      return ok(true);
    } catch (error) {
      logger.error(
        "Failed to stop Drive watch",
        { userId, folderId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to stop Drive watch",
          error as Error,
          "DriveWatchesService.stopWatch"
        )
      );
    }
  }

  /**
   * List all active watches for a user
   * Returns watches with expiration status
   */
  static async listWatches(
    userId: string
  ): Promise<ActionResult<DriveWatchListItemDto[]>> {
    try {
      logger.info("Listing Drive watches", {
        component: "DriveWatchesService.listWatches",
        userId,
      });

      const watches = await DriveWatchesQueries.getActiveWatchesByUser(userId);

      // Fetch project names and folder names
      const watchesWithDetails: DriveWatchListItemDto[] = await Promise.all(
        watches.map(async (watch) => {
          // Get project name
          const project = await ProjectQueries.findById(
            watch.projectId,
            watch.organizationId
          );
          const projectName = project?.name ?? "Unknown Project";

          // Get folder name from Drive API
          const folderNameResult = await GoogleDriveService.getFileMetadata(
            userId,
            watch.folderId
          );
          const folderName = folderNameResult.isOk()
            ? folderNameResult.value.name
            : null;

          const now = Date.now();
          const expiresAt = new Date(watch.expiration);
          const isExpired = watch.expiration < now;
          const expiresIn = isExpired ? null : watch.expiration - now;

          return {
            id: watch.id,
            folderId: watch.folderId,
            projectId: watch.projectId,
            organizationId: watch.organizationId,
            expiresAt,
            isActive: watch.isActive,
            folderName,
            isExpired,
            expiresIn,
            projectName,
          };
        })
      );

      logger.info("Successfully listed Drive watches", {
        component: "DriveWatchesService.listWatches",
        userId,
        count: watchesWithDetails.length,
      });

      return ok(watchesWithDetails);
    } catch (error) {
      logger.error("Failed to list Drive watches", { userId }, error as Error);
      return err(
        ActionErrors.internal(
          "Failed to list Drive watches",
          error as Error,
          "DriveWatchesService.listWatches"
        )
      );
    }
  }

  /**
   * Renew an expiring watch
   * Stops old watch, creates new watch, and updates database
   */
  static async renewWatch(
    watch: DriveWatch,
    webhookUrl: string
  ): Promise<ActionResult<DriveWatchDto>> {
    try {
      logger.info("Renewing Drive watch", {
        component: "DriveWatchesService.renewWatch",
        watchId: watch.id,
        folderId: watch.folderId,
      });

      // Stop old watch via Google Drive API
      const stopResult = await GoogleDriveService.stopWatch(
        watch.userId,
        watch.channelId,
        watch.resourceId
      );

      if (stopResult.isErr()) {
        // Log but continue - watch may have already expired
        logger.warn("Failed to stop old watch during renewal", {
          component: "DriveWatchesService.renewWatch",
          watchId: watch.id,
          error: stopResult.error,
        });
      }

      // Deactivate old watch in database
      await DriveWatchesQueries.deactivateWatch(watch.channelId);

      // Create new watch
      const newWatchResult = await this.startWatch(
        watch.userId,
        watch.folderId,
        watch.projectId,
        watch.organizationId,
        webhookUrl
      );

      if (newWatchResult.isErr()) {
        return err(newWatchResult.error);
      }

      logger.info("Successfully renewed Drive watch", {
        component: "DriveWatchesService.renewWatch",
        oldWatchId: watch.id,
        newWatchId: newWatchResult.value.id,
      });

      return newWatchResult;
    } catch (error) {
      logger.error(
        "Failed to renew Drive watch",
        { watchId: watch.id },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to renew Drive watch",
          error as Error,
          "DriveWatchesService.renewWatch"
        )
      );
    }
  }

  /**
   * Process uploaded files from a Drive folder
   * Filters files to only audio/video MIME types, downloads, uploads to Blob,
   * creates recording, and triggers workflow
   */
  static async processFileUpload(
    userId: string,
    folderId: string,
    files: Array<{
      id: string;
      name: string;
      mimeType: string;
      createdTime?: string;
      modifiedTime?: string;
    }>
  ): Promise<ActionResult<{ processed: number; skipped: number }>> {
    try {
      logger.info("Processing Drive file uploads", {
        component: "DriveWatchesService.processFileUpload",
        userId,
        folderId,
        fileCount: files.length,
      });

      // Get watch to find project and organization
      const watch = await DriveWatchesQueries.getWatchByUserAndFolder(
        userId,
        folderId
      );

      if (!watch || !watch.isActive) {
        return err(
          ActionErrors.notFound(
            "Active Drive watch",
            "DriveWatchesService.processFileUpload"
          )
        );
      }

      let processed = 0;
      let skipped = 0;

      // Process each file
      for (const file of files) {
        // Filter to only audio/video files
        if (!isAudioOrVideoFile(file.mimeType)) {
          logger.info("Skipping non-media file", {
            component: "DriveWatchesService.processFileUpload",
            fileId: file.id,
            fileName: file.name,
            mimeType: file.mimeType,
          });
          skipped++;
          continue;
        }

        try {
          // Download file from Drive
          const downloadResult = await GoogleDriveService.downloadFile(
            userId,
            file.id
          );

          if (downloadResult.isErr()) {
            logger.error("Failed to download file from Drive", {
              component: "DriveWatchesService.processFileUpload",
              fileId: file.id,
              fileName: file.name,
              error: downloadResult.error,
            });
            skipped++;
            continue;
          }

          const fileBuffer = downloadResult.value;

          // Upload to Blob storage
          const blobResult = await uploadToBlob(
            fileBuffer,
            file.name,
            file.mimeType
          );

          // Create recording
          const recordingData: NewRecording = {
            projectId: watch.projectId,
            title: file.name,
            description: null,
            fileUrl: blobResult.url,
            fileName: file.name,
            fileSize: fileBuffer.length,
            fileMimeType: file.mimeType,
            duration: null, // Will be extracted later
            recordingDate: file.createdTime
              ? new Date(file.createdTime)
              : new Date(),
            transcriptionStatus: "pending",
            transcriptionText: null,
            organizationId: watch.organizationId,
            createdById: userId,
          };

          const recordingResult = await RecordingService.createRecording(
            recordingData,
            false // Don't invalidate cache yet, will be done by workflow
          );

          if (recordingResult.isErr()) {
            logger.error("Failed to create recording", {
              component: "DriveWatchesService.processFileUpload",
              fileId: file.id,
              fileName: file.name,
              error: recordingResult.error,
            });
            skipped++;
            continue;
          }

          const recording = recordingResult.value;

          // Trigger AI processing workflow
          await start(convertRecordingIntoAiInsights, [recording.id]).catch(
            (error: unknown) => {
              logger.error("Failed to trigger AI processing workflow", {
                component: "DriveWatchesService.processFileUpload",
                recordingId: recording.id,
                error: error as Error,
              });
            }
          );

          logger.info("Successfully processed Drive file", {
            component: "DriveWatchesService.processFileUpload",
            fileId: file.id,
            fileName: file.name,
            recordingId: recording.id,
          });

          processed++;
        } catch (error) {
          logger.error("Error processing file", {
            component: "DriveWatchesService.processFileUpload",
            fileId: file.id,
            fileName: file.name,
            error: error as Error,
          });
          skipped++;
        }
      }

      logger.info("Completed processing Drive file uploads", {
        component: "DriveWatchesService.processFileUpload",
        userId,
        folderId,
        processed,
        skipped,
      });

      return ok({ processed, skipped });
    } catch (error) {
      logger.error(
        "Failed to process Drive file uploads",
        { userId, folderId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to process Drive file uploads",
          error as Error,
          "DriveWatchesService.processFileUpload"
        )
      );
    }
  }
}

