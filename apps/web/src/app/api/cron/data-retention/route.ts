import { logger } from "@/lib/logger";
import { DataRetentionService } from "@/server/services/data-retention.service";
import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

/**
 * GET /api/cron/data-retention
 * Automatically cleans up expired data for ISO 27001 A.8.10 compliance
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 *
 * Cleanup targets:
 * - Expired GDPR data exports (past expiresAt)
 * - Expired sessions (past expiresAt)
 * - Archived recordings past 90-day retention period
 */
export async function GET(request: NextRequest) {
  await connection();

  try {
    // Authenticate via CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/data-retention",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/data-retention",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting data retention cleanup cron job", {
      component: "GET /api/cron/data-retention",
    });

    const report = await DataRetentionService.runAll();

    logger.info("Data retention cleanup cron job completed", {
      component: "GET /api/cron/data-retention",
      report,
    });

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in data retention cleanup cron job", {
      component: "GET /api/cron/data-retention",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 },
    );
  }
}
