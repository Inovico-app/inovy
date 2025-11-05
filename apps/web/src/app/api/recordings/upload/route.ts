import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

/**
 * POST /api/recordings/upload
 * Upload a recording file using FormData with streaming support
 * This handles the complete flow: file upload to Blob + database record
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth session
    const { getUser, getOrganization } = getKindeServerSession();
    const user = await getUser();
    const organization = await getOrganization();

    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("Starting recording upload via API route", {
      component: "POST /api/recordings/upload",
      userId: user.id,
      organizationId: organization.orgCode,
    });

    // Parse form data with streaming support
    const formData = await request.formData();

    // Extract form data
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const recordingDateStr = formData.get("recordingDate") as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!projectId || !title || !recordingDateStr) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Please upload mp3, mp4, wav, or m4a files",
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum of ${
            MAX_FILE_SIZE / 1024 / 1024
          }MB`,
        },
        { status: 400 }
      );
    }

    logger.info("File validation passed", {
      component: "POST /api/recordings/upload",
      userId: user.id,
      projectId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // Upload file to Vercel Blob with streaming support
    const blob = await put(`recordings/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    logger.info("File uploaded to Blob", {
      component: "POST /api/recordings/upload",
      url: blob.url,
    });

    // Create recording in database
    const result = await RecordingService.createRecording({
      projectId,
      title,
      description: description ?? null,
      fileUrl: blob.url,
      fileName: file.name,
      fileSize: file.size,
      fileMimeType: file.type,
      duration: null, // Will be extracted later
      recordingDate: new Date(recordingDateStr),
      transcriptionStatus: "pending",
      transcriptionText: null,
      organizationId: organization.orgCode,
      createdById: user.id,
    });

    if (result.isErr()) {
      logger.error("Failed to create recording in database", {
        component: "POST /api/recordings/upload",
        error: result.error,
      });
      return NextResponse.json(
        { error: "Failed to create recording" },
        { status: 500 }
      );
    }

    const recording = result.value;

    logger.info("Recording created successfully", {
      component: "POST /api/recordings/upload",
      recordingId: recording.id,
      projectId,
    });

    // Revalidate the project page
    revalidatePath(`/projects/${projectId}`);

    // Trigger AI processing workflow in the background (fire and forget)
    // Don't await to prevent response body lock issues
    start(convertRecordingIntoAiInsights, [recording.id])
      .then((runConversion) => {
        logger.info("AI processing workflow triggered from upload recording", {
          component: "POST /api/recordings/upload",
          recordingId: recording.id,
          run: { id: runConversion.runId, status: runConversion.status },
        });
      })
      .catch((error) => {
        logger.error(
          "Failed to trigger AI processing workflow from upload recording",
          {
            component: "POST /api/recordings/upload",
            recordingId: recording.id,
            error,
          }
        );
      });

    return NextResponse.json(
      { success: true, recordingId: recording.id },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Error in POST /api/recordings/upload", {
      component: "POST /api/recordings/upload",
      error,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Configure Next.js to handle large file uploads with streaming
export const maxDuration = 300; // 5 minutes for large file uploads

