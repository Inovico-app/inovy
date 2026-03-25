import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  API_TIMEOUT_30_SECONDS,
  CACHE_MAX_AGE_1_HOUR,
} from "@/lib/constants/api";
import { decrypt } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { assertOrganizationAccess } from "@/lib/rbac/organization-isolation";
import { RecordingService } from "@/server/services/recording.service";
import { resolveFetchableUrl } from "@/server/services/storage";
import { type NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to serve decrypted recording files
 * Handles encryption/decryption transparently for playback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> },
) {
  const { recordingId } = await params;
  try {
    // Get authenticated session
    const authResult = await getBetterAuthSession();
    if (authResult.isErr() || !authResult.value.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, organization } = authResult.value;
    if (!user || !organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recording
    const recordingResult =
      await RecordingService.getRecordingByIdInternal(recordingId);
    if (recordingResult.isErr() || !recordingResult.value) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    const recording = recordingResult.value;

    // Verify organization access
    try {
      assertOrganizationAccess(
        recording.organizationId,
        organization.id,
        "recording-playback",
      );
    } catch {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 },
      );
    }

    // Check storage status — file may not be available yet
    if (!recording.fileUrl || recording.storageStatus !== "completed") {
      if (recording.storageStatus === "failed") {
        return NextResponse.json(
          { error: "Recording storage failed" },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          error: "Recording file not yet available",
          storageStatus: recording.storageStatus,
        },
        { status: 202, headers: { "Retry-After": "10" } },
      );
    }

    // For non-encrypted recordings, redirect to SAS URL to avoid buffering large files
    if (!recording.isEncrypted) {
      const sasUrl = await resolveFetchableUrl(recording.fileUrl, 60);
      return NextResponse.redirect(sasUrl, 302);
    }

    // Encrypted path: resolve URL, download, and decrypt
    // Resolve fetch URL: Azure blobs need a read SAS token (public access disabled)
    const fetchUrl = await resolveFetchableUrl(recording.fileUrl, 60);

    // Download file from storage with timeout
    // Note: This loads the entire file into memory. For files up to 500MB (MAX_FILE_SIZE),
    // this is acceptable, but consider streaming decryption for future optimization.
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      API_TIMEOUT_30_SECONDS,
    );

    let response: Response;
    try {
      response = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Request timeout while fetching recording file" },
          { status: 504 },
        );
      }
      throw error;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch recording file" },
        { status: 500 },
      );
    }

    let fileBuffer: Buffer;
    try {
      const encryptedData = await response.arrayBuffer();
      fileBuffer = decrypt(Buffer.from(encryptedData).toString("base64"));
    } catch (error) {
      logger.error("Failed to decrypt recording", {
        component: "recording-playback-route",
        recordingId,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return NextResponse.json(
        { error: "Failed to decrypt recording" },
        { status: 500 },
      );
    }

    const fileMimeType = recording.fileMimeType ?? "application/octet-stream";
    const MIME_TO_EXT: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/mp3": "mp3",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/m4a": "m4a",
    };
    const fileName =
      recording.fileName ?? `recording.${MIME_TO_EXT[fileMimeType] ?? "bin"}`;

    const isDownload = request.nextUrl.searchParams.get("download") === "1";
    const contentDisposition = isDownload
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": fileMimeType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": contentDisposition,
        "Cache-Control": `private, max-age=${CACHE_MAX_AGE_1_HOUR}`,
      },
    });
  } catch (error) {
    logger.error("Error serving recording playback", {
      component: "recording-playback-route",
      recordingId,
      error: error instanceof Error ? error : new Error(String(error)),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
