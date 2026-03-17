import { toast } from "sonner";

const blobProvider =
  process.env.NEXT_PUBLIC_BLOB_STORAGE_PROVIDER || "vercel";
const useAzure = blobProvider === "azure";

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
  const uploadFn = useAzure
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

const EXT_TO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webm": "video/webm",
};

function getContentType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

/**
 * Upload file to Azure Blob Storage using XMLHttpRequest for progress tracking.
 * Sends the raw File directly (xhr.send(file)) — no transformation, no manual
 * contentLength/contentMD5 — to avoid SDK verification mismatches (e.g. MP4).
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
    xhr.setRequestHeader("Content-Type", getContentType(file));

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
