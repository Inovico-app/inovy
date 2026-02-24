import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { DataRetentionService } from "@/server/services/data-retention.service";
import { getBetterAuthSession } from "@/lib/better-auth-session";

/**
 * GET /api/admin/data-retention-stats
 * Get data retention statistics for monitoring and compliance
 * Requires admin/superadmin authentication
 */
export async function GET(_request: NextRequest) {
  try {
    const authResult = await getBetterAuthSession();

    if (authResult.isErr() || !authResult.value.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { user } = authResult.value;

    if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "owner") {
      logger.warn("Non-admin user attempted to access data retention stats", {
        component: "GET /api/admin/data-retention-stats",
        userId: user.id,
        role: user.role,
      });
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    logger.info("Fetching data retention statistics", {
      component: "GET /api/admin/data-retention-stats",
      userId: user.id,
    });

    const stats = await DataRetentionService.getRetentionStats();
    const compliance = DataRetentionService.validateCompliance();

    logger.info("Data retention statistics retrieved", {
      component: "GET /api/admin/data-retention-stats",
      userId: user.id,
      stats,
      compliance,
    });

    return NextResponse.json({
      success: true,
      stats,
      compliance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Error fetching data retention statistics",
      {},
      error as Error
    );
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
