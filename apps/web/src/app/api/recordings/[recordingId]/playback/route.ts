import { decrypt } from "@/lib/encryption";
import { getAuthSession } from "@/lib/auth";
import { RecordingService } from "@/server/services/recording.service";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { type NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to serve decrypted recording files
 * Handles encryption/decryption transparently for playback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const { recordingId } = await params;

    // Get authenticated session
    const authResult = await getAuthSession();
    if (authResult.isErr() || !authResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = authResult.value;
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recording
    const recordingResult = await RecordingService.getRecordingById(recordingId);
    if (recordingResult.isErr() || !recordingResult.value) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    const recording = recordingResult.value;

    // Verify organization access
    try {
      assertOrganizationAccess(
        recording.organizationId,
        organization.orgCode,
        "recording-playback"
      );
    } catch {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // Download file from Vercel Blob with timeout
    // Note: This loads the entire file into memory. For files up to 500MB (MAX_FILE_SIZE),
    // this is acceptable, but consider streaming decryption for future optimization.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(recording.fileUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timeout while fetching recording file" },
          { status: 504 }
        );
      }
      throw error;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch recording file" },
        { status: 500 }
      );
    }

    // Decrypt if encrypted
    let fileBuffer: Buffer;
    if (recording.isEncrypted) {
      try {
        const encryptedData = await response.arrayBuffer();
        fileBuffer = decrypt(Buffer.from(encryptedData).toString("base64"));
      } catch (error) {
        console.error("Failed to decrypt recording", error);
        return NextResponse.json(
          { error: "Failed to decrypt recording" },
          { status: 500 }
        );
      }
    } else {
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }

    // Return decrypted file with appropriate headers
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": recording.fileMimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": `inline; filename="${recording.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error serving recording playback", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

