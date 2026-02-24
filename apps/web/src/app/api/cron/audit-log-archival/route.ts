import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DataRetentionService } from "@/server/services/data-retention.service";

/**
 * GET /api/cron/audit-log-archival
 * Performs annual audit log archival for logs older than 7 years
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 * 
 * Compliance: NEN 7510, SOC 2, AVG/GDPR
 * 
 * This job should run annually on January 1st at 02:00 UTC
 * Archives audit logs older than 7 years to long-term storage
 * 
 * Note: Logs should be exported to long-term storage before deletion
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/audit-log-archival",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/audit-log-archival",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting annual audit log archival cron job", {
      component: "GET /api/cron/audit-log-archival",
      timestamp: new Date().toISOString(),
    });

    const result = await DataRetentionService.performAnnualAuditLogArchival();

    if (!result.success) {
      logger.error("Annual audit log archival failed", {
        component: "GET /api/cron/audit-log-archival",
        error: result.error,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    logger.info("Annual audit log archival cron job completed successfully", {
      component: "GET /api/cron/audit-log-archival",
      archived: result.archived,
      deleted: result.deleted,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      archived: result.archived,
      deleted: result.deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Error in annual audit log archival cron job",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
