import { toast } from "sonner";

const platform = process.env.NEXT_PUBLIC_PLATFORM ?? "vercel";

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

/**
 * Client-side wrapper for uploading recordings directly to blob storage.
 * Uses Vercel Blob client upload on Vercel, or Azure SAS token flow on Azure.
 */
export async function uploadRecordingToBlob(
  file: File,
  options?: UploadRecordingOptions
): Promise<UploadResult> {
  if (platform === "azure") {
    return uploadViaAzure(file, options);
  }
  return uploadViaVercel(file, options);
}

/**
 * Vercel Blob client upload (original flow)
 */
async function uploadViaVercel(
  file: File,
  options?: UploadRecordingOptions
): Promise<UploadResult> {
  const { upload } = await import("@vercel/blob/client");

  const result = await toast
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
  return toast
    .promise(
      (async () => {
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
        }: {
          uploadUrl: string;
          blobUrl: string;
          pathname: string;
          tokenPayload: string;
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
          }),
          signal: options?.signal,
        });

        if (!completeResponse.ok) {
          const error = (await completeResponse.json()) as { error?: string };
          throw new Error(error.error ?? "Failed to process upload");
        }

        return { url: blobUrl, pathname };
      })(),
      {
        loading: "Opname wordt opgeslagen en geüpload... Een moment geduld.",
        success: "Opname succesvol opgeslagen!",
        error: "Fout bij opslaan van opname",
      }
    )
    .unwrap();
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

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Azure upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Azure upload failed"));

    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(file);
  });
}
