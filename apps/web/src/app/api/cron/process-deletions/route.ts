import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { UserDeletionRequestsQueries } from "@/server/data-access/user-deletion-requests.queries";
import { GdprDeletionService } from "@/server/services/gdpr-deletion.service";
import { after, connection } from "next/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/cron/process-deletions
 * Processes user deletion requests that have passed their 30-day recovery window
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 *
 * Schedule: Runs daily at 02:00 UTC as configured in vercel.json.
 */
export async function GET(request: NextRequest) {
  await connection();
  const startTime = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/process-deletions",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/process-deletions",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting deletion processing cron job", {
      component: "GET /api/cron/process-deletions",
    });

    const pendingDeletions =
      await UserDeletionRequestsQueries.claimPendingDeletions();

    if (pendingDeletions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending deletions to process",
        durationMs: Date.now() - startTime,
      });
    }

    const results = {
      total: pendingDeletions.length,
      succeeded: 0,
      failed: 0,
      errors: [] as Array<{ requestId: string; error: string }>,
    };

    for (const deletionRequest of pendingDeletions) {
      try {
        const result = await GdprDeletionService.processDeletionRequest(
          deletionRequest.id,
          deletionRequest.userId,
          deletionRequest.organizationId,
          null,
          null,
        );

        if (result.isOk()) {
          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push({
            requestId: deletionRequest.id,
            error: result.error.message,
          });

          logger.error("Deletion request processing returned error", {
            component: "GET /api/cron/process-deletions",
            requestId: deletionRequest.id,
            error: result.error.message,
          });
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push({
          requestId: deletionRequest.id,
          error: errorMsg,
        });

        logger.error("Failed to process deletion request", {
          component: "GET /api/cron/process-deletions",
          requestId: deletionRequest.id,
          error,
        });

        Sentry.withScope((scope) => {
          scope.setTags({ component: "cron-process-deletions" });
          scope.setContext("deletion", { request_id: deletionRequest.id });
          Sentry.captureException(error);
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info("Deletion processing cron job completed", {
      component: "GET /api/cron/process-deletions",
      results,
      durationMs: duration,
    });

    const success = results.failed === 0;
    return NextResponse.json(
      {
        success,
        results,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: success ? 200 : 207 },
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      "Error in deletion processing cron job",
      {
        component: "GET /api/cron/process-deletions",
        durationMs: duration,
      },
      error as Error,
    );

    after(() => {
      Sentry.withScope((scope) => {
        scope.setTags({ component: "cron-process-deletions" });
        scope.setContext("cron", {
          cron_job: "process-deletions",
          duration_ms: duration,
        });
        Sentry.captureException(error);
      });
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        durationMs: duration,
      },
      { status: 500 },
    );
  }
}
