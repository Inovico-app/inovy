import type { PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";

export interface UploadRecordingOptions {
  clientPayload?: string;
  onUploadProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
  signal?: AbortSignal;
}

/**
 * Client-side wrapper for uploading recordings directly to Vercel Blob.
 * Uses token-based authentication via the /api/recordings/upload endpoint.
 *
 * @param file - The file to upload
 * @param options - Upload configuration including progress tracking and metadata
 * @returns Promise resolving to blob information (url, pathname, etc.)
 */
export async function uploadRecordingToBlob(
  file: File,
  options?: UploadRecordingOptions
): Promise<PutBlobResult> {
  return toast
    .promise(
      upload(`recordings/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/recordings/upload",
        clientPayload: options?.clientPayload,
        onUploadProgress: options?.onUploadProgress,
        abortSignal: options?.signal,
      }),
      {
        loading: "Opname wordt opgeslagen en geüpload... Een moment geduld.",
        success: "Opname succesvol opgeslagen!",
        error: "Fout bij opslaan van opname",
      }
    )
    .unwrap();
}

