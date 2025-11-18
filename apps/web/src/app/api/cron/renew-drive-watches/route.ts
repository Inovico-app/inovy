import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DriveWatchesQueries } from "@/server/data-access/drive-watches.queries";
import { DriveWatchesService } from "@/server/services/drive-watches.service";

/**
 * GET /api/cron/renew-drive-watches
 * Automatically renews expiring Drive watches
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate via CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/renew-drive-watches",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/renew-drive-watches",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting Drive watch renewal cron job", {
      component: "GET /api/cron/renew-drive-watches",
    });

    // Get watches expiring in next 2 hours (in milliseconds)
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const thresholdMs = Date.now() + twoHoursInMs;

    const expiringWatches = await DriveWatchesQueries.getExpiringWatches(
      thresholdMs
    );

    logger.info("Found watches to renew", {
      component: "GET /api/cron/renew-drive-watches",
      count: expiringWatches.length,
    });

    const results = {
      total: expiringWatches.length,
      renewed: 0,
      failed: 0,
      errors: [] as Array<{ watchId: string; error: string }>,
    };

    // Get webhook URL from environment
    const webhookUrl =
      process.env.NEXT_PUBLIC_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/google-drive`;

    // Process each watch
    for (const watch of expiringWatches) {
      try {
        logger.info("Renewing watch", {
          component: "GET /api/cron/renew-drive-watches",
          watchId: watch.id,
          folderId: watch.folderId,
          userId: watch.userId,
          expiration: new Date(watch.expiration).toISOString(),
        });

        const renewResult = await DriveWatchesService.renewWatch(
          watch,
          webhookUrl
        );

        if (renewResult.isErr()) {
          results.failed++;
          results.errors.push({
            watchId: watch.id,
            error: renewResult.error.message,
          });

          logger.error("Failed to renew watch", {
            component: "GET /api/cron/renew-drive-watches",
            watchId: watch.id,
            folderId: watch.folderId,
            userId: watch.userId,
            error: renewResult.error,
          });
        } else {
          results.renewed++;

          logger.info("Successfully renewed watch", {
            component: "GET /api/cron/renew-drive-watches",
            watchId: watch.id,
            newWatchId: renewResult.value.id,
            folderId: watch.folderId,
            userId: watch.userId,
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          watchId: watch.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        logger.error("Error renewing watch", {
          component: "GET /api/cron/renew-drive-watches",
          watchId: watch.id,
          error: error as Error,
        });
      }
    }

    logger.info("Drive watch renewal cron job completed", {
      component: "GET /api/cron/renew-drive-watches",
      results,
    });

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Error in Drive watch renewal cron job",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

