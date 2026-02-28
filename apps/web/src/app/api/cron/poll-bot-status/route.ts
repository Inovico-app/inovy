import { logger } from "@/lib/logger";
import { BotStatusPollService } from "@/server/services/bot-status-poll.service";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cron/poll-bot-status
 * Polls active bot sessions to check their current status
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 *
 * Schedule: Configured to run every 1 minute in vercel.json.
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
        component: "GET /api/cron/poll-bot-status",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/poll-bot-status",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting bot status polling cron job", {
      component: "GET /api/cron/poll-bot-status",
    });

    const result = await BotStatusPollService.pollActiveSessions();

    if (result.isErr()) {
      logger.error("Bot status polling cron job failed", {
        component: "GET /api/cron/poll-bot-status",
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

    logger.info("Bot status polling cron job completed", {
      component: "GET /api/cron/poll-bot-status",
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

    // Log error details server-side only
    if (error instanceof Error) {
      logger.error(
        "Error in bot status polling cron job",
        {
          component: "GET /api/cron/poll-bot-status",
          durationMs: duration,
          errorMessage: error.message,
          errorStack: error.stack,
        },
        error
      );
    } else {
      logger.error("Error in bot status polling cron job", {
        component: "GET /api/cron/poll-bot-status",
        durationMs: duration,
        error: typeof error === "string" ? error : JSON.stringify(error),
      });
    }

    // Return generic error to client (no sensitive details)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

