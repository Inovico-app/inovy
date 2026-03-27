import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { deepgramCircuitBreaker } from "@/server/services/circuit-breaker.service";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { after, type NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";

/**
 * GET /api/cron/retry-failed-transcriptions
 * Retries recordings that failed transcription and are queued for retry.
 * Skips execution if the Deepgram circuit breaker is open.
 * Authenticated via Authorization: Bearer ${CRON_SECRET} header
 *
 * Schedule: Configured to run every 5 minutes in vercel.json.
 */
export async function GET(request: NextRequest) {
  await connection();
  const startTime = Date.now();

  try {
    // Authenticate via CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error("CRON_SECRET not configured", {
        component: "GET /api/cron/retry-failed-transcriptions",
      });
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("Unauthorized cron job attempt", {
        component: "GET /api/cron/retry-failed-transcriptions",
        hasAuthHeader: !!authHeader,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Skip if Deepgram circuit is open — retries would fail anyway
    if (deepgramCircuitBreaker.getState() === "open") {
      logger.info("Skipping retry — Deepgram circuit breaker is open", {
        component: "GET /api/cron/retry-failed-transcriptions",
      });
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "deepgram_circuit_open",
        timestamp: new Date().toISOString(),
      });
    }

    const recordings = await RecordingsQueries.getRecordingsQueuedForRetry(10);

    logger.info("Starting retry of failed transcriptions", {
      component: "GET /api/cron/retry-failed-transcriptions",
      count: recordings.length,
    });

    const results = {
      total: recordings.length,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const recording of recordings) {
      try {
        const result = await convertRecordingIntoAiInsights(
          recording.id,
          false,
          recording.recallBotId ?? undefined,
        );

        if (result.success) {
          await RecordingsQueries.resetTranscriptionRetry(recording.id);
          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push(`${recording.id}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`${recording.id}: ${errorMsg}`);

        Sentry.withScope((scope) => {
          scope.setTags({
            component: "cron-retry-failed-transcriptions",
          });
          scope.setContext("recording", {
            recording_id: recording.id,
            retry_count: recording.transcriptionRetryCount,
          });
          Sentry.captureException(error);
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info("Retry failed transcriptions cron completed", {
      component: "GET /api/cron/retry-failed-transcriptions",
      ...results,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      results,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof Error) {
      logger.error("Error in retry failed transcriptions cron job", {
        component: "GET /api/cron/retry-failed-transcriptions",
        durationMs: duration,
        errorMessage: error.message,
        errorStack: error.stack,
      });
    } else {
      logger.error("Error in retry failed transcriptions cron job", {
        component: "GET /api/cron/retry-failed-transcriptions",
        durationMs: duration,
        error: typeof error === "string" ? error : JSON.stringify(error),
      });
    }

    after(() => {
      Sentry.withScope((scope) => {
        scope.setTags({ component: "cron-retry-failed-transcriptions" });
        scope.setContext("cron", {
          cron_job: "retry-failed-transcriptions",
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
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
