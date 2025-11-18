import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import {
  addRateLimitHeaders,
  checkRateLimit,
  createRateLimitResponse,
} from "@/lib/rate-limit";
import { RecordingService } from "@/server/services";
import { AIInsightService } from "@/server/services/ai-insight.service";
import { TaskExtractionService } from "@/server/services/task-extraction.service";
import { type NextRequest, NextResponse } from "next/server";

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

    const user = authResult.value.user;

    // Check rate limit (10/hour free, 100/hour pro)
    const rateLimitResult = await checkRateLimit(user.id, {
      maxRequests: undefined, // Use tier-based default, but override with custom limits
      windowSeconds: 3600, // 1 hour
    });

    // Override with custom limits for task extraction
    const tierLimits = rateLimitResult.limit === 100 ? 10 : 100; // free: 10, pro: 100
    const customRateLimitResult = await checkRateLimit(user.id, {
      maxRequests: tierLimits,
      windowSeconds: 3600,
    });

    if (!customRateLimitResult.allowed) {
      return createRateLimitResponse(customRateLimitResult);
    }

    // Get recording
    const recordingResult = await RecordingService.getRecordingById(
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
    const organization = authResult.value.organization;

    try {
      assertOrganizationAccess(
        recording.organizationId,
        organization?.orgCode,
        "api/extract-tasks/[recordingId]"
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

    logger.info("Starting task extraction", {
      component: "ExtractTasksRoute",
      recordingId,
    });

    // Get transcription insight for utterances
    const transcriptionInsightResult =
      await AIInsightService.getInsightByTypeInternal(
        recordingId,
        "transcription"
      );

    let utterances;
    if (transcriptionInsightResult.isOk() && transcriptionInsightResult.value) {
      utterances = transcriptionInsightResult.value.utterances ?? undefined;
    }

    // Extract tasks
    const result = await TaskExtractionService.extractTasks(
      recordingId,
      recording.projectId,
      recording.transcriptionText,
      recording.organizationId,
      user.id,
      utterances
    );

    if (result.isErr()) {
      logger.error("Task extraction failed", {
        component: "ExtractTasksRoute",
        recordingId,
        error: result.error,
      });

      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      extraction: result.value,
    });

    return addRateLimitHeaders(response, customRateLimitResult);
  } catch (error) {
    logger.error("Error in task extraction API", {
      component: "ExtractTasksRoute",
      error,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

