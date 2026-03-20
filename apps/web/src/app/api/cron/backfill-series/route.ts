// src/app/api/cron/backfill-series/route.ts
import { logger } from "@/lib/logger";
import { BotSeriesSubscriptionsQueries } from "@/server/data-access/bot-series-subscriptions.queries";
import { BotBackfillService } from "@/server/services/bot-backfill.service";
import { type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

export async function GET(request: NextRequest) {
  await connection();
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/backfill-series",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting series backfill cron job", {
      component: "GET /api/cron/backfill-series",
    });

    const subscriptions =
      await BotSeriesSubscriptionsQueries.findAllActiveWithBotEnabled();

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );

    let totalSessionsCreated = 0;
    const errors: Array<{ subscriptionId: string; error: string }> = [];

    for (const subscription of subscriptions) {
      const result = await BotBackfillService.backfillSubscription(
        subscription,
        { timeMin: now, timeMax: thirtyDaysFromNow },
      );

      if (result.isOk()) {
        totalSessionsCreated += result.value.sessionsCreated;
      } else {
        errors.push({
          subscriptionId: subscription.id,
          error: result.error.message,
        });
      }

      // Rate limiting: small delay between calendar API calls to avoid
      // hitting Google/Microsoft rate limits (spec section 4.4)
      await new Promise((r) => setTimeout(r, 200));
    }

    const duration = Date.now() - startTime;

    logger.info("Series backfill cron job completed", {
      component: "GET /api/cron/backfill-series",
      subscriptionsProcessed: subscriptions.length,
      totalSessionsCreated,
      errors: errors.length,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      subscriptionsProcessed: subscriptions.length,
      totalSessionsCreated,
      errors,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error in series backfill cron job",
      {
        component: "GET /api/cron/backfill-series",
        durationMs: duration,
      },
      error as Error,
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
