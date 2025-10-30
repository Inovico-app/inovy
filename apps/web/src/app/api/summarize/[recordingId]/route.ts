import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { SummaryService } from "@/server/services/summary.service";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { recordingId } = await props.params;

    // Verify authentication
    const authResult = await getAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recording
    const recordingResult = await RecordingsQueries.selectRecordingById(
      recordingId
    );

    if (recordingResult.isErr() || !recordingResult.value) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    const recording = recordingResult.value;

    // Verify user has access
    const user = authResult.value.user;
    const organization = authResult.value.organization;

    if (
      recording.organizationId !== organization?.orgCode &&
      recording.createdById !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      await AIInsightsQueries.getInsightByType(recordingId, "transcription");

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
}

// GET endpoint to retrieve existing summary
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { recordingId } = await props.params;

    // Verify authentication
    const authResult = await getAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recording
    const recordingResult = await RecordingsQueries.selectRecordingById(
      recordingId
    );

    if (recordingResult.isErr() || !recordingResult.value) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    const recording = recordingResult.value;

    // Verify user has access
    const user = authResult.value.user;
    const organization = authResult.value.organization;

    if (
      recording.organizationId !== organization?.orgCode &&
      recording.createdById !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get existing summary
    const summaryInsightResult = await AIInsightsQueries.getInsightByType(
      recordingId,
      "summary"
    );

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

