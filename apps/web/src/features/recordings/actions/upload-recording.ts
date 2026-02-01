"use server";

import { getBetterAuthSession } from "@/lib/better-auth-session";
import { encrypt, generateEncryptionMetadata } from "@/lib/encryption";
import { logger } from "@/lib/logger";
import { RecordingService } from "@/server/services/recording.service";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { put } from "@vercel/blob";
import { start } from "workflow/api";

/**
 * Upload a recording file using FormData
 * This handles the complete flow: file upload to Blob + database record
 * Note: This is a regular server action, not using authorizedActionClient because
 * it handles FormData which doesn't work well with the action client schema validation
 */
export async function uploadRecordingFormAction(
  formData: FormData
): Promise<{ success: boolean; recordingId?: string; error?: string }> {
  try {
    // Get auth session
    const authResult = await getBetterAuthSession();
    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.user
    ) {
      return { success: false, error: "Not authenticated" };
    }

    const user = authResult.value.user;
    const organizationId = authResult.value.organization?.id;

    if (!organizationId) {
      return { success: false, error: "No organization found" };
    }

    // Extract form data
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const recordingDateStr = formData.get("recordingDate") as string;
    const consentGivenStr = formData.get("consentGiven") as string | null;
    const consentGivenAtStr = formData.get("consentGivenAt") as string | null;
    const consentGiven = consentGivenStr === "true";
    const consentGivenAt = consentGivenAtStr
      ? new Date(consentGivenAtStr)
      : null;

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
          "Unsupported file type. Please upload mp3, mp4, wav, m4a, or webm files",
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

    // Encrypt file before upload (if encryption is enabled)
    const shouldEncrypt = process.env.ENABLE_ENCRYPTION_AT_REST === "true";
    let fileToUpload: File | Buffer = file;
    let encryptionMetadata: string | null = null;

    // Validate encryption configuration before attempting encryption
    if (shouldEncrypt && !process.env.ENCRYPTION_MASTER_KEY) {
      logger.error("Encryption enabled but master key not configured", {
        component: "uploadRecordingFormAction",
      });
      return {
        success: false,
        error:
          "Encryption is enabled but ENCRYPTION_MASTER_KEY is not configured. Please contact support.",
      };
    }

    if (shouldEncrypt) {
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const encryptedBase64 = encrypt(fileBuffer);
        const encryptedBuffer = Buffer.from(encryptedBase64, "base64");
        fileToUpload = encryptedBuffer;
        encryptionMetadata = JSON.stringify(generateEncryptionMetadata());

        logger.info("File encrypted before upload", {
          component: "uploadRecordingFormAction",
          originalSize: file.size,
          encryptedSize: encryptedBuffer.length,
        });
      } catch (error) {
        logger.error("Failed to encrypt file", {
          component: "uploadRecordingFormAction",
          error,
        });
        return {
          success: false,
          error: "Failed to encrypt file for secure storage",
        };
      }
    }

    // Upload file to Vercel Blob (use private access if encrypted)
    const uploadOptions: {
      access: "public" | "private";
      contentType: string;
    } = {
      access: shouldEncrypt ? ("private" as const) : ("public" as const),
      contentType: file.type,
    };
    const blob = await put(
      `recordings/${Date.now()}-${file.name}`,
      fileToUpload,
      uploadOptions as Parameters<typeof put>[2]
    );

    logger.info("File uploaded to Blob", {
      component: "uploadRecordingFormAction",
      url: blob.url,
    });

    // Create recording in database with consent information
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
      organizationId,
      createdById: user.id,
      consentGiven,
      consentGivenBy: consentGiven ? user.id : null,
      consentGivenAt: consentGiven && consentGivenAt ? consentGivenAt : null,
      isEncrypted: shouldEncrypt,
      encryptionMetadata: encryptionMetadata,
    });

    if (result.isErr()) {
      logger.error("Failed to create recording in database", {
        component: "uploadRecordingFormAction",
        error: result.error.message,
      });
      return { success: false, error: "Failed to create recording" };
    }

    const recording = result.value;

    logger.info("Recording created successfully", {
      component: "uploadRecordingFormAction",
      recordingId: recording.id,
      projectId,
    });

    // Cache invalidation is handled by RecordingService.createRecording
    // which calls CacheInvalidation.invalidateProjectRecordings using updateTag

    // Trigger AI processing workflow in the background (fire and forget)
    const workflowRun = await start(convertRecordingIntoAiInsights, [
      recording.id,
    ]).catch((error) => {
      logger.error("Failed to trigger AI processing workflow", {
        component: "uploadRecordingFormAction",
        recordingId: recording.id,
        error,
      });
    });

    const workflowResult = await workflowRun?.returnValue;

    if (workflowResult && !workflowResult.success) {
      logger.error("Failed to get workflow result", {
        component: "uploadRecordingFormAction",
        recordingId: recording.id,
        error: workflowResult.error,
      });
      return {
        success: false,
        error: "Workflow execution failed, reason: " + workflowResult.error,
      };
    }

    if (workflowResult?.success && workflowResult.value?.status === "failed") {
      logger.error("Workflow completed with failure status", {
        component: "uploadRecordingFormAction",
        recordingId: recording.id,
        error: workflowResult.value.error,
      });
      return {
        success: false,
        error:
          "Workflow execution failed, reason: " + workflowResult.value.error,
      };
    }

    if (workflowResult) {
      logger.info("AI processing workflow started", {
        component: "uploadRecordingFormAction",
        recordingId: recording.id,
      });
    }

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

