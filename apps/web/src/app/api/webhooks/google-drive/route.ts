import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { sanitizeString } from "@/lib/external-api-validation";
import { checkRateLimit, webhookRateLimit } from "@/lib/rate-limit";
import { DriveWatchesQueries } from "@/server/data-access/drive-watches.queries";
import { GoogleDriveService } from "@/server/services/google-drive.service";
// Note: DriveWatchesService will be available after PR #216 is merged
// For now, importing directly - this will work once the service is merged
import { DriveWatchesService } from "@/server/services/drive-watches.service";

/**
 * GET /api/webhooks/google-drive
 * Webhook verification endpoint (if needed by Google)
 * This endpoint is public (no auth required) as Google Drive calls it directly
 */
export async function GET() {
  return NextResponse.json({
    message: "Google Drive webhook endpoint is active",
    endpoint: "/api/webhooks/google-drive",
  });
}

/**
 * POST /api/webhooks/google-drive
 * Receives Google Drive push notifications for file changes
 * This endpoint is public (no auth required) as Google Drive calls it directly
 */
export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    try {
      await checkRateLimit(`webhook:google-drive:${clientIp}`, webhookRateLimit);
    } catch (error) {
      logger.warn("Rate limit exceeded for Google Drive webhook", {
        component: "POST /api/webhooks/google-drive",
        clientIp,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json({ success: true });
    }

    const rawChannelId = request.headers.get("x-goog-channel-id");
    const rawResourceId = request.headers.get("x-goog-resource-id");
    const rawResourceState = request.headers.get("x-goog-resource-state");
    const rawMessageNumber = request.headers.get("x-goog-message-number");

    const channelId = rawChannelId ? sanitizeString(rawChannelId) : null;
    const resourceId = rawResourceId ? sanitizeString(rawResourceId) : null;
    const resourceState = rawResourceState ? sanitizeString(rawResourceState) : null;
    const messageNumber = rawMessageNumber ? sanitizeString(rawMessageNumber) : null;

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
          resourceId,
          messageNumber,
        });
        // Still return 200 to avoid Google retries
        return NextResponse.json({ success: true });
      }

      logger.info("Processing change notification", {
        component: "POST /api/webhooks/google-drive",
        channelId,
        resourceId,
        messageNumber,
      });

      // Process change notification asynchronously
      // Don't await to ensure we return quickly (< 10s)
      processChangeNotification(channelId).catch((error) => {
        logger.error(
          "Error processing change notification",
          {
            component: "POST /api/webhooks/google-drive",
            channelId,
            resourceId,
            messageNumber,
          },
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

    if (!watch) {
      logger.warn("Watch not found for channel ID", {
        component: "processChangeNotification",
        channelId,
      });
      return;
    }

    if (!watch.isActive) {
      logger.info("Watch is inactive", {
        component: "processChangeNotification",
        channelId,
        watchId: watch.id,
        folderId: watch.folderId,
        userId: watch.userId,
      });
      return;
    }

    logger.info("Change detected for folder", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      watchId: watch.id,
      channelId,
      resourceId: watch.resourceId,
    });

    // Fetch recent files from the watched folder (last 10 minutes to account for timing issues)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
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
        channelId,
        error: filesResult.error,
      });
      return;
    }

    const files = filesResult.value;

    logger.info("Fetched files from Drive folder", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      totalFiles: files.length,
      channelId,
    });

    // Filter files created/modified in last 10 minutes
    // If we have fewer than 50 files total, process all of them to avoid missing files due to timing
    const recentFiles =
      files.length < 50
        ? files
        : files.filter((file) => {
            const modifiedTime = file.modifiedTime
              ? new Date(file.modifiedTime)
              : null;
            const createdTime = file.createdTime
              ? new Date(file.createdTime)
              : null;

            return (
              (modifiedTime && modifiedTime > tenMinutesAgo) ||
              (createdTime && createdTime > tenMinutesAgo)
            );
          });

    if (recentFiles.length === 0) {
      logger.info("No recent files found in watched folder", {
        component: "processChangeNotification",
        folderId: watch.folderId,
        userId: watch.userId,
        totalFiles: files.length,
        timeWindow: "10 minutes",
        channelId,
      });
      return;
    }

    logger.info("Found recent files in watched folder", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      fileCount: recentFiles.length,
      totalFiles: files.length,
      fileNames: recentFiles.map((f) => f.name),
      fileIds: recentFiles.map((f) => f.id),
      channelId,
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
        channelId,
        fileCount: recentFiles.length,
        error: processResult.error,
        errorCode: processResult.error.code,
        errorMessage: processResult.error.message,
      });
      return;
    }

    logger.info("Successfully processed file uploads", {
      component: "processChangeNotification",
      folderId: watch.folderId,
      userId: watch.userId,
      channelId,
      processed: processResult.value.processed,
      skipped: processResult.value.skipped,
      totalFiles: recentFiles.length,
    });
  } catch (error) {
    logger.error(
      "Error processing change notification",
      {
        component: "processChangeNotification",
        channelId,
      },
      error as Error
    );
    // Don't throw - errors are logged but webhook should still return 200
  }
}

