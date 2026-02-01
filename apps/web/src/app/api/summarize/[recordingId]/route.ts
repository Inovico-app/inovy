import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { createSafeActionErrorResponse } from "@/lib/safe-error-response";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { AIInsightService } from "@/server/services/ai-insight.service";
import { rateLimiter } from "@/server/services/rate-limiter.service";
import { RecordingService } from "@/server/services/recording.service";
import { SummaryService } from "@/server/services/summary.service";
import { type NextRequest, NextResponse } from "next/server";

export const POST = withRateLimit(
  async (
    request: NextRequest,
    props: { params: Promise<{ recordingId: string }> }
  ) => {
    try {
      const { recordingId } = await props.params;

      // Verify authentication
      const authResult = await getBetterAuthSession();
      if (
        authResult.isErr() ||
        !authResult.value.isAuthenticated ||
        !authResult.value.user
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = authResult.value.user;

      // Get recording
      const recordingResult =
        await RecordingService.getRecordingById(recordingId);

      if (recordingResult.isErr() || !recordingResult.value) {
        return NextResponse.json(
          { error: "Recording not found" },
          { status: 404 }
        );
      }

      const recording = recordingResult.value;

      // Verify user has access
      const organization = authResult.value.organization;

      try {
        assertOrganizationAccess(
          recording.organizationId,
          organization?.id,
          "api/summarize/[recordingId]/POST"
        );
      } catch (error) {
        // Return 404 to prevent information leakage
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Check if transcription is available
      if (!recording.transcriptionText) {
        return NextResponse.json(
          { error: "Recording not yet transcribed" },
          { status: 400 }
        );
      }

      logger.info("Starting summary generation", {
        component: "SummarizeRoute",
        recordingId,
      });

      // Get transcription insight for utterances
      const transcriptionInsightResult =
        await AIInsightService.getInsightByTypeInternal(
          recordingId,
          "transcription"
        );

      let utterances;
      if (
        transcriptionInsightResult.isOk() &&
        transcriptionInsightResult.value
      ) {
        utterances = transcriptionInsightResult.value.utterances ?? undefined;
      }

      // Generate summary
      const result = await SummaryService.generateSummary(
        recordingId,
        recording.transcriptionText,
        utterances
      );

      if (result.isErr()) {
        logger.error("Summary generation failed", {
          component: "SummarizeRoute",
          recordingId,
          error: result.error,
        });

        return NextResponse.json(
          { error: result.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        summary: result.value,
      });
    } catch (error) {
      logger.error("Error in summary API", {
        component: "SummarizeRoute",
        error,
      });

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  },
  {
    maxRequests: async (userId: string) => {
      const tier = await rateLimiter.getUserTier(userId);
      return tier === "free" ? 5 : 50;
    },
    windowSeconds: 3600, // 1 hour
  },
  async () => {
    // Custom user ID extraction for rate limiting
    const authResult = await getBetterAuthSession();
    if (authResult.isOk() && authResult.value.isAuthenticated) {
      return authResult.value.user?.id ?? null;
    }
    return null;
  }
);

// GET endpoint to retrieve existing summary
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { recordingId } = await props.params;

    // Verify authentication
    const authResult = await getBetterAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recording
    const recordingResult =
      await RecordingService.getRecordingById(recordingId);

    if (recordingResult.isErr() || !recordingResult.value) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    const recording = recordingResult.value;

    // Verify user has access
    const organization = authResult.value.organization;

    try {
      assertOrganizationAccess(
        recording.organizationId,
        organization?.id,
        "api/summarize/[recordingId]/GET"
      );
    } catch (error) {
      // Return 404 to prevent information leakage
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get existing summary
    const summaryInsightResult =
      await AIInsightService.getInsightByTypeInternal(recordingId, "summary");

    if (summaryInsightResult.isErr()) {
      return NextResponse.json(
        { error: "Failed to retrieve summary" },
        { status: 500 }
      );
    }

    const summaryInsight = summaryInsightResult.value;

    if (!summaryInsight) {
      return NextResponse.json({ error: "Summary not found" }, { status: 404 });
    }

    return NextResponse.json({
      summary: {
        content: summaryInsight.content,
        confidence: summaryInsight.confidenceScore,
        status: summaryInsight.processingStatus,
      },
    });
  } catch (error) {
    logger.error("Error retrieving summary", {
      component: "SummarizeRoute.GET",
      error,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

