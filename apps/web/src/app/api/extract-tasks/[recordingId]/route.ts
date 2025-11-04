import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
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

    return NextResponse.json({
      success: true,
      extraction: result.value,
    });
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

