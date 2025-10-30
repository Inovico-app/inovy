"use server";

import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

/**
 * Upload a recording file using FormData
 * This handles the complete flow: file upload to Blob + database record
 */
export async function uploadRecordingFormAction(
  formData: FormData
): Promise<{ success: boolean; recordingId?: string; error?: string }> {
  try {
    // Get auth session
    const authResult = await getAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      return { success: false, error: "Not authenticated" };
    }

    const user = authResult.value.user;
    const organization = authResult.value.organization;

    if (!organization) {
      return { success: false, error: "No organization found" };
    }

    // Extract form data
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const recordingDateStr = formData.get("recordingDate") as string;

    // Validate inputs
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    if (!projectId || !title || !recordingDateStr) {
      return { success: false, error: "Missing required fields" };
    }

    // Validate file type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number]
      )
    ) {
      return {
        success: false,
        error:
          "Unsupported file type. Please upload mp3, mp4, wav, or m4a files",
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    logger.info("Starting recording upload", {
      component: "uploadRecordingFormAction",
      userId: user.id,
      projectId,
      fileName: file.name,
      fileSize: file.size,
    });

    // Upload file to Vercel Blob
    const blob = await put(`recordings/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    logger.info("File uploaded to Blob", {
      component: "uploadRecordingFormAction",
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
        component: "uploadRecordingFormAction",
        error: result.error,
      });
      return { success: false, error: "Failed to create recording" };
    }

    const recording = result.value;

    logger.info("Recording created successfully", {
      component: "uploadRecordingFormAction",
      recordingId: recording.id,
      projectId,
    });

    // Revalidate the project page
    revalidatePath(`/projects/${projectId}`);

    // Trigger transcription in the background (fire and forget)
    fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/transcribe/${recording.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).catch((error) => {
      logger.error("Failed to trigger transcription", {
        component: "uploadRecordingFormAction",
        recordingId: recording.id,
        error,
      });
    });

    return { success: true, recordingId: recording.id };
  } catch (error) {
    logger.error("Error in uploadRecordingFormAction", {
      component: "uploadRecordingFormAction",
      error,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

