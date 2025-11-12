import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DriveWatchesQueries } from "@/server/data-access/drive-watches.queries";
import { GoogleDriveService } from "@/server/services/google-drive.service";
// Note: DriveWatchesService will be available after PR #216 is merged
// For now, importing directly - this will work once the service is merged
import { DriveWatchesService } from "@/server/services/drive-watches.service";

/**
 * POST /api/webhooks/google-drive
 * Receives Google Drive push notifications for file changes
 * This endpoint is public (no auth required) as Google Drive calls it directly
 */
export async function POST(request: NextRequest) {
  try {
    // Extract Google Drive notification headers
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceId = request.headers.get("x-goog-resource-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const messageNumber = request.headers.get("x-goog-message-number");

    logger.info("Received Google Drive notification", {
      component: "POST /api/webhooks/google-drive",
      channelId,
      resourceId,
      resourceState,
      messageNumber,
    });

    // Handle sync notification (initial verification)
    if (resourceState === "sync") {
      logger.info("Sync notification received for channel", {
        component: "POST /api/webhooks/google-drive",
        channelId,
      });
      // Return 200 immediately for sync notifications
      return NextResponse.json({ success: true });
    }

    // Handle change notifications
    if (resourceState === "change") {
      if (!channelId) {
        logger.warn("Change notification missing channel ID", {
          component: "POST /api/webhooks/google-drive",
        });
        // Still return 200 to avoid Google retries
        return NextResponse.json({ success: true });
      }

      // Process change notification asynchronously
      // Don't await to ensure we return quickly (< 10s)
      processChangeNotification(channelId).catch((error) => {
        logger.error(
          "Error processing change notification",
          { channelId },
          error as Error
        );
      });

      // Return 200 immediately to acknowledge receipt
      return NextResponse.json({ success: true });
    }

    // Unknown resource state - log but return 200
    logger.warn("Unknown resource state in notification", {
      component: "POST /api/webhooks/google-drive",
      resourceState,
      channelId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Always return 200 to avoid Google retries
    logger.error(
      "Error in Google Drive webhook handler",
      {},
      error as Error
    );
    return NextResponse.json({ success: true });
  }
}

/**
 * Process change notification asynchronously
 * Fetches recent files and processes them
 */
async function processChangeNotification(channelId: string): Promise<void> {
  try {
    // Get watch by channel ID
    const watch = await DriveWatchesQueries.getWatchByChannel(channelId);

    if (!watch || !watch.isActive) {
      logger.info("Watch not found or inactive", {
        component: "processChangeNotification",
        channelId,
      });
      return;
    }

    logger.info("Change detected for folder", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      watchId: watch.id,
    });

    // Fetch recent files from the watched folder (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const filesResult = await GoogleDriveService.getFolderFiles(
      watch.userId,
      watch.folderId,
      {
        pageSize: 50,
        orderBy: "modifiedTime desc",
        fields: "files(id, name, mimeType, createdTime, modifiedTime)",
      }
    );

    if (filesResult.isErr()) {
      logger.error("Failed to fetch files from Drive folder", {
        component: "processChangeNotification",
        folderId: watch.folderId,
        userId: watch.userId,
        error: filesResult.error,
      });
      return;
    }

    const files = filesResult.value;

    // Filter files created/modified in last 5 minutes
    const recentFiles = files.filter((file) => {
      const modifiedTime = file.modifiedTime
        ? new Date(file.modifiedTime)
        : null;
      const createdTime = file.createdTime ? new Date(file.createdTime) : null;

      return (
        (modifiedTime && modifiedTime > fiveMinutesAgo) ||
        (createdTime && createdTime > fiveMinutesAgo)
      );
    });

    if (recentFiles.length === 0) {
      logger.info("No recent files found in watched folder", {
        component: "processChangeNotification",
        folderId: watch.folderId,
        userId: watch.userId,
      });
      return;
    }

    logger.info("Found recent files in watched folder", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      fileCount: recentFiles.length,
      fileNames: recentFiles.map((f) => f.name),
    });

    // Process uploaded files
    const processResult = await DriveWatchesService.processFileUpload(
      watch.userId,
      watch.folderId,
      recentFiles
    );

    if (processResult.isErr()) {
      logger.error("Failed to process file uploads", {
        component: "processChangeNotification",
        folderId: watch.folderId,
        userId: watch.userId,
        error: processResult.error,
      });
      return;
    }

    logger.info("Successfully processed file uploads", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      processed: processResult.value.processed,
      skipped: processResult.value.skipped,
    });
  } catch (error) {
    logger.error(
      "Error processing change notification",
      { channelId },
      error as Error
    );
    // Don't throw - errors are logged but webhook should still return 200
  }
}

