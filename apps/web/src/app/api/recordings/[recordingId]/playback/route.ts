import { decrypt } from "@/lib/encryption";
import { getAuthSession } from "@/lib/auth";
import { RecordingService } from "@/server/services";
import { assertOrganizationAccess } from "@/lib/organization-isolation";
import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

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

    // Download file from Vercel Blob
    const blob = await get(recording.fileUrl);

    // Decrypt if encrypted
    let fileBuffer: Buffer;
    if (recording.isEncrypted) {
      try {
        const encryptedData = await blob.arrayBuffer();
        fileBuffer = decrypt(Buffer.from(encryptedData).toString("base64"));
      } catch (error) {
        console.error("Failed to decrypt recording", error);
        return NextResponse.json(
          { error: "Failed to decrypt recording" },
          { status: 500 }
        );
      }
    } else {
      fileBuffer = Buffer.from(await blob.arrayBuffer());
    }

    // Return decrypted file with appropriate headers
    return new NextResponse(fileBuffer, {
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

