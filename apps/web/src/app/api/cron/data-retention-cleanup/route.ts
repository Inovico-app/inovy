import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DataRetentionService } from "@/server/services/data-retention.service";

/**
 * GET /api/cron/data-retention-cleanup
 * Performs daily automated data cleanup according to retention policies
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 * 
 * Compliance: AVG/GDPR, NEN 7510, SSD-2.4.01
 * 
 * This job runs daily at 02:00 UTC and performs:
 * - Chat conversation archival and permanent deletion
 * - Embedding cache cleanup
 * - Expired data export cleanup
 * - User deletion request processing
 * - Old notification cleanup
 * - Task history cleanup
 * - Reprocessing history cleanup
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/data-retention-cleanup",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/data-retention-cleanup",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting data retention cleanup cron job", {
      component: "GET /api/cron/data-retention-cleanup",
      timestamp: new Date().toISOString(),
    });

    const result = await DataRetentionService.performDailyCleanup();

    if (!result.success) {
      logger.error("Data retention cleanup completed with errors", {
        component: "GET /api/cron/data-retention-cleanup",
        results: result.results,
      });

      return NextResponse.json(
        {
          success: false,
          results: result.results,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const totalCleaned = Object.values(result.results).reduce(
      (sum, result) => sum + result.cleaned,
      0
    );

    logger.info("Data retention cleanup cron job completed successfully", {
      component: "GET /api/cron/data-retention-cleanup",
      totalCleaned,
      results: result.results,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      totalCleaned,
      results: result.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Error in data retention cleanup cron job",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
