import type { Platform } from "@/lib/platform";
import { toast } from "sonner";

const platform: Platform =
  (process.env.NEXT_PUBLIC_PLATFORM as Platform) ?? "vercel";

export interface UploadRecordingOptions {
  clientPayload?: string;
  onUploadProgress?: (progress: {
    loaded: number;
    total: number;
    percentage: number;
  }) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  url: string;
  pathname: string;
}

const UPLOAD_TOAST = {
  loading: "Opname wordt opgeslagen en geüpload... Een moment geduld.",
  success: "Opname succesvol opgeslagen!",
  error: "Fout bij opslaan van opname",
} as const;

/**
 * Client-side wrapper for uploading recordings directly to blob storage.
 * Uses Vercel Blob client upload on Vercel, or Azure SAS token flow on Azure.
 */
export async function uploadRecordingToBlob(
  file: File,
  options?: UploadRecordingOptions
): Promise<UploadResult> {
  const uploadFn =
    platform === "azure"
      ? uploadViaAzure(file, options)
      : uploadViaVercel(file, options);

  return toast.promise(uploadFn, UPLOAD_TOAST).unwrap();
}

/**
 * Vercel Blob client upload (original flow)
 */
async function uploadViaVercel(
  file: File,
  options?: UploadRecordingOptions
): Promise<UploadResult> {
  const { upload } = await import("@vercel/blob/client");

  const result = await upload(`recordings/${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/recordings/upload",
    clientPayload: options?.clientPayload,
    onUploadProgress: options?.onUploadProgress,
    abortSignal: options?.signal,
  });

  return { url: result.url, pathname: result.pathname };
}

/**
 * Azure SAS token upload flow:
 * 1. Request SAS token from server
 * 2. Upload directly to Azure Blob Storage
 * 3. Notify server of completion
 */
async function uploadViaAzure(
  file: File,
  options?: UploadRecordingOptions
): Promise<UploadResult> {
  // Step 1: Get SAS upload token
  const tokenResponse = await fetch("/api/recordings/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate-token",
      metadata: options?.clientPayload,
    }),
    signal: options?.signal,
  });

  if (!tokenResponse.ok) {
    const error = (await tokenResponse.json()) as { error?: string };
    throw new Error(error.error ?? "Failed to generate upload token");
  }

  const {
    uploadUrl,
    blobUrl,
    pathname,
    tokenPayload,
    tokenSignature,
  }: {
    uploadUrl: string;
    blobUrl: string;
    pathname: string;
    tokenPayload: string;
    tokenSignature: string;
  } = await tokenResponse.json();

  // Step 2: Upload directly to Azure using SAS URL
  await uploadToAzureWithProgress(
    uploadUrl,
    file,
    options?.onUploadProgress,
    options?.signal
  );

  // Step 3: Notify server upload is complete
  const completeResponse = await fetch("/api/recordings/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "upload-complete",
      blobUrl,
      pathname,
      tokenPayload,
      tokenSignature,
    }),
    signal: options?.signal,
  });

  if (!completeResponse.ok) {
    const error = (await completeResponse.json()) as { error?: string };
    throw new Error(error.error ?? "Failed to process upload");
  }

  return { url: blobUrl, pathname };
}

/**
 * Upload file to Azure Blob Storage using XMLHttpRequest for progress tracking
 */
function uploadToAzureWithProgress(
  sasUrl: string,
  file: File,
  onProgress?: UploadRecordingOptions["onUploadProgress"],
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", sasUrl);
    xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
    xhr.setRequestHeader("Content-Type", file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      };
    }

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = () => xhr.abort();

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Azure upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error("Azure upload failed"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort);
    }

    xhr.send(file);
  });
}
