import { type NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { TranscriptionService } from "@/server/services/transcription.service";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
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

    // Verify user has access to this recording
    const user = authResult.value.user;
    const organization = authResult.value.organization;

    if (
      recording.organizationId !== organization?.orgCode &&
      recording.createdById !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    logger.info("Starting transcription", {
      component: "TranscribeRoute",
      recordingId,
      fileUrl: recording.fileUrl,
    });

    // Start transcription (this will run in background)
    const result = await TranscriptionService.transcribeUploadedFile(
      recordingId,
      recording.fileUrl
    );

    if (result.isErr()) {
      logger.error("Transcription failed", {
        component: "TranscribeRoute",
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
      transcription: result.value,
    });
  } catch (error) {
    logger.error("Error in transcription API", {
      component: "TranscribeRoute",
      error,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

