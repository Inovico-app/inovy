import { logger } from "@/lib/logger";
import { BotCalendarMonitorService } from "@/server/services/bot-calendar-monitor.service";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cron/monitor-calendar
 * Monitors Google Calendar for upcoming meetings and creates bot sessions
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 *
 * Schedule: Configured to run every 5 minutes in vercel.json.
 *
 * Vercel Free Tier Limitation: On Vercel free tier, crons can only run once
 * every 24 hours. The current schedule requires a paid tier. For free tier,
 * update vercel.json to use "0 0 * * *" (once daily at midnight UTC).
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate via CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/monitor-calendar",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/monitor-calendar",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting calendar monitoring cron job", {
      component: "GET /api/cron/monitor-calendar",
    });

    const result = await BotCalendarMonitorService.monitorCalendars();

    if (result.isErr()) {
      logger.error("Calendar monitoring cron job failed", {
        component: "GET /api/cron/monitor-calendar",
        error: result.error.message,
      });

      return NextResponse.json(
        {
          success: false,
          error: result.error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    logger.info("Calendar monitoring cron job completed", {
      component: "GET /api/cron/monitor-calendar",
      results: result.value,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      results: result.value,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error in calendar monitoring cron job",
      {
        component: "GET /api/cron/monitor-calendar",
        durationMs: duration,
      },
      error as Error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

