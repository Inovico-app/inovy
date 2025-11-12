import { err, ok } from "neverthrow";
import { start } from "workflow/api";
import { ActionErrors, type ActionResult } from "../../lib/action-errors";
import { isAudioOrVideoFile, uploadToBlob } from "../../lib/google-drive-utils";
import { logger } from "../../lib/logger";
import { assertOrganizationAccess } from "../../lib/organization-isolation";
import { DriveWatchesQueries } from "../data-access";
import { ProjectQueries } from "../data-access/projects.queries";
import type { DriveWatch, NewDriveWatch } from "../db/schema";
import type { DriveWatchDto, DriveWatchListDto } from "../dto/drive-watch.dto";
import { RecordingService } from "./recording.service";
import { GoogleDriveService } from "./google-drive.service";
import { convertRecordingIntoAiInsights } from "../../workflows/convert-recording";

/**
 * Drive Watches Service
 * Business logic for managing Google Drive watch subscriptions
 */
export class DriveWatchesService {
  /**
   * Get webhook URL from environment
   */
  private static getWebhookUrl(): string {
    const webhookUrl =
      process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/webhooks/google-drive`
        : "http://localhost:3000/api/webhooks/google-drive";

    if (!webhookUrl) {
      throw new Error("Webhook URL not configured");
    }

    return webhookUrl;
  }

  /**
   * Start watching a Drive folder
   * Orchestrates watch creation: check existing, deactivate expired, create new
   */
  static async startWatch(
    userId: string,
    folderId: string,
    projectId: string,
    organizationId: string
  ): Promise<ActionResult<DriveWatchDto>> {
    try {
      // Verify project belongs to organization
      const project = await ProjectQueries.findById(projectId, organizationId);
      if (!project) {
        return err(
          ActionErrors.notFound(
            "Project",
            "DriveWatchesService.startWatch"
          )
        );
      }

      // Check for existing active watch
      const existingWatch = await DriveWatchesQueries.getWatchByUserAndFolder(
        userId,
        folderId
      );

      if (existingWatch) {
        // Check if watch is still valid
        if (existingWatch.expiration > Date.now()) {
          logger.info("Watch already active", {
            userId,
            folderId,
            watchId: existingWatch.id,
          });

          // Get folder name from Drive API
          const folderNameResult = await this.getFolderName(
            userId,
            folderId
          );

          return ok({
            id: existingWatch.id,
            folderId: existingWatch.folderId,
            projectId: existingWatch.projectId,
            organizationId: existingWatch.organizationId,
            expiresAt: new Date(existingWatch.expiration),
            isActive: existingWatch.isActive,
            folderName: folderNameResult.isOk() ? folderNameResult.value : null,
          });
        } else {
          // Watch expired, deactivate it
          logger.info("Deactivating expired watch", {
            userId,
            folderId,
            watchId: existingWatch.id,
          });

          await DriveWatchesQueries.deactivateWatch(
            existingWatch.channelId
          );

          // Try to stop the watch with Google (best effort)
          const stopResult = await GoogleDriveService.stopWatch(
            userId,
            existingWatch.channelId,
            existingWatch.resourceId
          );

          if (stopResult.isErr()) {
            logger.warn("Failed to stop expired watch with Google", {
              userId,
              channelId: existingWatch.channelId,
              error: stopResult.error,
            });
          }
        }
      }

      // Create new watch via Google Drive API
      const webhookUrl = this.getWebhookUrl();
      const watchResult = await GoogleDriveService.startWatch(
        userId,
        folderId,
        webhookUrl
      );

      if (watchResult.isErr()) {
        return err(watchResult.error);
      }

      const { channelId, resourceId, expiration } = watchResult.value;

      // Save watch to database
      const watchData: NewDriveWatch = {
        userId,
        folderId,
        channelId,
        resourceId,
        expiration,
        isActive: true,
        projectId,
        organizationId,
      };

      const watch = await DriveWatchesQueries.createWatch(watchData);

      logger.info("Started Drive watch", {
        userId,
        folderId,
        watchId: watch.id,
        channelId,
        expiration: new Date(expiration),
      });

      // Get folder name from Drive API
      const folderNameResult = await this.getFolderName(userId, folderId);

      return ok({
        id: watch.id,
        folderId: watch.folderId,
        projectId: watch.projectId,
        organizationId: watch.organizationId,
        expiresAt: new Date(watch.expiration),
        isActive: watch.isActive,
        folderName: folderNameResult.isOk() ? folderNameResult.value : null,
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
   */
  static async stopWatch(
    userId: string,
    folderId: string
  ): Promise<ActionResult<boolean>> {
    try {
      const watch = await DriveWatchesQueries.getWatchByUserAndFolder(
        userId,
        folderId
      );

      if (!watch) {
        return err(
          ActionErrors.notFound(
            "Drive watch",
            "DriveWatchesService.stopWatch"
          )
        );
      }

      // Stop watch with Google Drive API
      const stopResult = await GoogleDriveService.stopWatch(
        userId,
        watch.channelId,
        watch.resourceId
      );

      if (stopResult.isErr()) {
        // Log but continue with deactivation
        logger.warn("Failed to stop watch with Google", {
          userId,
          channelId: watch.channelId,
          error: stopResult.error,
        });
      }

      // Deactivate watch in database
      await DriveWatchesQueries.deactivateWatch(watch.channelId);

      logger.info("Stopped Drive watch", {
        userId,
        folderId,
        watchId: watch.id,
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
   */
  static async listWatches(userId: string): Promise<ActionResult<DriveWatchListDto>> {
    try {
      const watches = await DriveWatchesQueries.getActiveWatchesByUser(userId);

      // Get project names and folder names
      const watchesWithDetails = await Promise.all(
        watches.map(async (watch) => {
          // Get project name
          const project = await ProjectQueries.findById(
            watch.projectId,
            watch.organizationId
          );

          // Get folder name from Drive API
          const folderNameResult = await this.getFolderName(
            userId,
            watch.folderId
          );

          const now = Date.now();
          const expiresAt = watch.expiration;
          const isExpired = expiresAt < now;
          const expiresIn = isExpired ? null : expiresAt - now;

          return {
            id: watch.id,
            folderId: watch.folderId,
            projectId: watch.projectId,
            organizationId: watch.organizationId,
            expiresAt: new Date(expiresAt),
            isActive: watch.isActive,
            folderName:
              folderNameResult.isOk() ? folderNameResult.value : null,
            isExpired,
            expiresIn,
            projectName: project?.name ?? "Unknown Project",
          };
        })
      );

      return ok(watchesWithDetails);
    } catch (error) {
      logger.error(
        "Failed to list Drive watches",
        { userId },
        error as Error
      );
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
   * Stops old watch, creates new watch, updates database
   */
  static async renewWatch(
    watch: DriveWatch
  ): Promise<ActionResult<DriveWatchDto>> {
    try {
      logger.info("Renewing Drive watch", {
        userId: watch.userId,
        folderId: watch.folderId,
        watchId: watch.id,
      });

      // Stop old watch (best effort)
      const stopResult = await GoogleDriveService.stopWatch(
        watch.userId,
        watch.channelId,
        watch.resourceId
      );

      if (stopResult.isErr()) {
        logger.warn("Failed to stop old watch during renewal", {
          userId: watch.userId,
          channelId: watch.channelId,
          error: stopResult.error,
        });
      }

      // Deactivate old watch
      await DriveWatchesQueries.deactivateWatch(watch.channelId);

      // Create new watch
      const webhookUrl = this.getWebhookUrl();
      const newWatchResult = await GoogleDriveService.startWatch(
        watch.userId,
        watch.folderId,
        webhookUrl
      );

      if (newWatchResult.isErr()) {
        return err(newWatchResult.error);
      }

      const { channelId, resourceId, expiration } = newWatchResult.value;

      // Save new watch to database
      const watchData: NewDriveWatch = {
        userId: watch.userId,
        folderId: watch.folderId,
        channelId,
        resourceId,
        expiration,
        isActive: true,
        projectId: watch.projectId,
        organizationId: watch.organizationId,
      };

      const newWatch = await DriveWatchesQueries.createWatch(watchData);

      logger.info("Renewed Drive watch", {
        userId: watch.userId,
        folderId: watch.folderId,
        oldWatchId: watch.id,
        newWatchId: newWatch.id,
      });

      // Get folder name from Drive API
      const folderNameResult = await this.getFolderName(
        watch.userId,
        watch.folderId
      );

      return ok({
        id: newWatch.id,
        folderId: newWatch.folderId,
        projectId: newWatch.projectId,
        organizationId: newWatch.organizationId,
        expiresAt: new Date(newWatch.expiration),
        isActive: newWatch.isActive,
        folderName: folderNameResult.isOk() ? folderNameResult.value : null,
      });
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
   * Process file uploads from Drive folder
   * Filters audio/video files, downloads, uploads to Blob, creates recordings, triggers workflow
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

      // Filter files to only audio/video
      const mediaFiles = files.filter((file) =>
        isAudioOrVideoFile(file.mimeType)
      );

      const skipped = files.length - mediaFiles.length;

      if (skipped > 0) {
        logger.info("Skipped non-media files", {
          userId,
          folderId,
          skipped,
          total: files.length,
        });
      }

      if (mediaFiles.length === 0) {
        return ok({ processed: 0, skipped });
      }

      // Process each file
      let processed = 0;
      const errors: string[] = [];

      for (const file of mediaFiles) {
        try {
          // Download file from Drive
          const downloadResult = await GoogleDriveService.downloadFile(
            userId,
            file.id
          );

          if (downloadResult.isErr()) {
            errors.push(`Failed to download ${file.name}: ${downloadResult.error.message}`);
            continue;
          }

          const fileBuffer = downloadResult.value;

          // Upload to Vercel Blob
          const blobResult = await uploadToBlob(
            fileBuffer,
            file.name,
            file.mimeType
          );

          // Create recording
          const recordingResult = await RecordingService.createRecording({
            projectId: watch.projectId,
            title: file.name,
            description: `Uploaded from Google Drive folder`,
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
          });

          if (recordingResult.isErr()) {
            errors.push(`Failed to create recording for ${file.name}: ${recordingResult.error.message}`);
            continue;
          }

          const recording = recordingResult.value;

          // Trigger AI processing workflow
          const workflowRun = await start(convertRecordingIntoAiInsights, [
            recording.id,
          ]).catch((error) => {
            logger.error("Failed to trigger AI processing workflow", {
              component: "DriveWatchesService.processFileUpload",
              recordingId: recording.id,
              fileName: file.name,
              error,
            });
            return null;
          });

          if (workflowRun) {
            logger.info("Triggered AI processing workflow", {
              component: "DriveWatchesService.processFileUpload",
              recordingId: recording.id,
              fileName: file.name,
              runId: workflowRun.runId,
            });
          }

          processed++;
        } catch (error) {
          logger.error("Error processing file", {
            userId,
            folderId,
            fileId: file.id,
            fileName: file.name,
            error: error as Error,
          });
          errors.push(`Error processing ${file.name}: ${(error as Error).message}`);
        }
      }

      if (errors.length > 0) {
        logger.warn("Some files failed to process", {
          userId,
          folderId,
          errors,
        });
      }

      logger.info("Processed Drive files", {
        userId,
        folderId,
        processed,
        skipped,
        total: files.length,
      });

      return ok({ processed, skipped });
    } catch (error) {
      logger.error(
        "Failed to process Drive file upload",
        { userId, folderId },
        error as Error
      );
      return err(
        ActionErrors.internal(
          "Failed to process Drive file upload",
          error as Error,
          "DriveWatchesService.processFileUpload"
        )
      );
    }
  }

  /**
   * Helper: Get folder name from Drive API
   */
  private static async getFolderName(
    userId: string,
    folderId: string
  ): Promise<ActionResult<string>> {
    try {
      const metadataResult = await GoogleDriveService.getFileMetadata(
        userId,
        folderId
      );

      if (metadataResult.isErr()) {
        return err(metadataResult.error);
      }

      return ok(metadataResult.value.name);
    } catch (error) {
      logger.warn("Failed to get folder name", {
        userId,
        folderId,
        error: error as Error,
      });
      return err(
        ActionErrors.internal(
          "Failed to get folder name",
          error as Error,
          "DriveWatchesService.getFolderName"
        )
      );
    }
  }
}

