import { getAuthSession } from "@/lib/auth/auth-helpers";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { rateLimiter } from "@/server/services/rate-limiter.service";
import { RecordingService } from "@/server/services/recording.service";
import { TranscriptionService } from "@/server/services/transcription.service";
import { type NextRequest, NextResponse } from "next/server";

export const POST = withRateLimit(
  async (
    request: NextRequest,
    props: { params: Promise<{ recordingId: string }> }
  ) => {
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

      // Get recording
      const recordingResult =
        await RecordingService.getRecordingById(recordingId);

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
          organization?.id,
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
  },
  {
    maxRequests: async (userId: string) => {
      const tier = await rateLimiter.getUserTier(userId);
      return tier === "free" ? 10 : 100;
    },
    windowSeconds: 3600, // 1 hour
  },
  async () => {
    // Custom user ID extraction for rate limiting
    const authResult = await getAuthSession();
    if (authResult.isOk() && authResult.value.isAuthenticated) {
      return authResult.value.user?.id ?? null;
    }
    return null;
  }
);

