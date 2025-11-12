import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { RecordingService } from "@/server/services";
import { TranscriptionService } from "@/server/services/transcription.service";
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

    if (recordingResult.isErr()) {
      logger.error("Recording not found", {
        recordingId,
        error: recordingResult.error?.message ?? "Unknown error",
      });
      return NextResponse.json(
        { error: recordingResult.error?.message ?? "Unknown error" },
        { status: 404 }
      );
    }

    const recording = recordingResult.value;

    if (!recording) {
      logger.error("Recording not found", {
        recordingId,
        error: "Recording not found",
      });
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this recording
    const organization = authResult.value.organization;

    try {
      assertOrganizationAccess(
        recording.organizationId,
        organization?.orgCode,
        "api/transcribe/[recordingId]"
      );
    } catch (error) {
      // Return 404 to prevent information leakage
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

