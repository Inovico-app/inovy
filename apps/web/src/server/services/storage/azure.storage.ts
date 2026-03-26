import {
  BlobClient,
  BlobSASPermissions,
  BlobServiceClient,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { randomUUID } from "crypto";
import path from "path";
import { Readable } from "stream";
import type {
  BlobProperties,
  ClientUploadOptions,
  ClientUploadToken,
  CopyFromUrlResult,
  StorageProvider,
  StoragePutOptions,
  StoragePutResult,
} from "./storage.types";

let _blobServiceClient: BlobServiceClient | null = null;

function getClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }
    _blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }
  return _blobServiceClient;
}

function getSharedKeyCredential(): StorageSharedKeyCredential {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error(
      "AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY are required for SAS token generation",
    );
  }
  return new StorageSharedKeyCredential(accountName, accountKey);
}

function getContainerName(access: "public" | "private"): string {
  const shared = process.env.AZURE_STORAGE_CONTAINER_NAME;
  if (shared) return shared;
  return access === "public"
    ? (process.env.AZURE_STORAGE_PUBLIC_CONTAINER ?? "public")
    : (process.env.AZURE_STORAGE_PRIVATE_CONTAINER ?? "private");
}

function getAccountName(): string {
  const name = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!name) {
    throw new Error("AZURE_STORAGE_ACCOUNT_NAME is not set");
  }
  return name;
}

/** Encode blob path for URL use (handles spaces and other special chars) */
function encodeBlobPathForUrl(blobPath: string): string {
  return blobPath.split("/").map(encodeURIComponent).join("/");
}

/**
 * Generate a SAS URL for a blob with the given permissions.
 * All Azure blob operations use SAS tokens for authentication.
 */
function generateBlobSasUrl(
  blobUrl: string,
  permissions: string,
  expiresInMinutes = 15,
): string {
  const credential = getSharedKeyCredential();
  const url = new URL(blobUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const containerName = pathParts[0]!;
  const blobName = pathParts.slice(1).join("/");

  const expiresOn = new Date();
  expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse(permissions),
      startsOn: new Date(),
      expiresOn,
    },
    credential,
  ).toString();

  const encodedPath =
    "/" +
    url.pathname.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `${url.origin}${encodedPath}?${sasToken}`;
}

export class AzureStorageProvider implements StorageProvider {
  async put(
    blobPath: string,
    data: File | Buffer | Blob,
    options: StoragePutOptions,
  ): Promise<StoragePutResult> {
    const containerName = getContainerName(options.access);
    const accountName = getAccountName();

    let finalPath = blobPath;
    if (options.addRandomSuffix) {
      const ext = path.extname(blobPath);
      const base = blobPath.slice(0, -ext.length || undefined);
      finalPath = `${base}-${randomUUID().slice(0, 8)}${ext}`;
    }

    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeBlobPathForUrl(finalPath)}`;
    const sasUrl = generateBlobSasUrl(blobUrl, "cw", 15);
    const blockBlobClient = new BlockBlobClient(sasUrl);

    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = Buffer.from(data as ArrayBuffer);
    }

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: options.contentType,
      },
    });

    return {
      url: blobUrl,
      pathname: finalPath,
    };
  }

  async del(url: string): Promise<void> {
    const sasUrl = generateBlobSasUrl(url, "d", 5);
    const blobClient = new BlobClient(sasUrl);
    await blobClient.deleteIfExists();
  }

  async getBlobProperties(
    url: string,
    options?: { pathname?: string },
  ): Promise<BlobProperties> {
    // Use connection string (SharedKey) for server-side property checks.
    // SAS can fail with 403 due to storage firewall, IP restrictions, or URL parsing.
    const client = getClient();
    const blobUrl = new URL(url);
    const pathParts = blobUrl.pathname.split("/").filter(Boolean);
    const containerName = pathParts[0]!;
    // When pathname is provided, use it directly to avoid URL encoding/decoding mismatches
    // that can cause BlobNotFound (e.g. spaces, special chars in the blob path).
    const blobName = options?.pathname ?? pathParts.slice(1).join("/");

    const containerClient = client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const props = await blobClient.getProperties();

    return {
      contentLength: props.contentLength,
      contentType: props.contentType,
    };
  }

  async generateClientUploadToken(
    options: ClientUploadOptions,
  ): Promise<ClientUploadToken> {
    const credential = getSharedKeyCredential();
    const containerName = getContainerName(options.access);
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;

    const ext = path.extname(options.path);
    const pathWithoutExt = options.path.slice(0, -ext.length || undefined);
    const finalPath = `${pathWithoutExt}-${randomUUID().slice(0, 8)}${ext}`;

    const expiresOn = new Date();
    expiresOn.setMinutes(
      expiresOn.getMinutes() + (options.expiresInMinutes ?? 30),
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: finalPath,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        startsOn: new Date(),
        expiresOn,
        // Omit contentType: SAS with contentType can reject uploads when client sends
        // a different Content-Type (e.g. mp4 as audio/mp4 vs video/mp4, or empty on Safari)
      },
      credential,
    ).toString();

    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeBlobPathForUrl(finalPath)}`;

    return {
      uploadUrl: `${blobUrl}?${sasToken}`,
      blobUrl,
      pathname: finalPath,
    };
  }

  async generateReadSasUrl(
    blobUrl: string,
    expiresInMinutes = 60,
  ): Promise<string> {
    return generateBlobSasUrl(blobUrl, "r", expiresInMinutes);
  }

  async copyFromURL(
    sourceUrl: string,
    destinationPath: string,
    options?: { access?: "public" | "private" },
  ): Promise<CopyFromUrlResult> {
    const containerName = getContainerName(options?.access ?? "private");
    const accountName = getAccountName();

    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeBlobPathForUrl(destinationPath)}`;

    let nodeStream: Readable | undefined;
    let contentLength: string | null = null;

    // Stream the file from the source (Recall.ai/S3) through to Azure Blob Storage.
    // We use streaming download→upload instead of beginCopyFromURL because Azure's
    // async server-side copy fails with cross-cloud pre-signed S3 URLs (signature
    // invalidation, IP restrictions, redirect issues).
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600_000); // 10 min total

    try {
      const response = await fetch(sourceUrl, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download from source: ${response.status} ${response.statusText}`,
        );
      }

      if (!response.body) {
        throw new Error("Source response has no body");
      }

      const contentType =
        response.headers.get("content-type") ?? "application/octet-stream";
      contentLength = response.headers.get("content-length");

      // Convert web ReadableStream to Node.js Readable for Azure SDK
      nodeStream = Readable.fromWeb(
        response.body as Parameters<typeof Readable.fromWeb>[0],
      );

      // Use connection-string-based client for upload (avoids SAS URL issues)
      const client = getClient();
      const containerClient = client.getContainerClient(containerName);
      const blockBlobClient =
        containerClient.getBlockBlobClient(destinationPath);

      await blockBlobClient.uploadStream(nodeStream, 4 * 1024 * 1024, 4, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
        abortSignal: controller.signal,
      });
    } catch (error) {
      nodeStream?.destroy();
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    // Get final blob properties
    const props = await this.getBlobProperties(blobUrl, {
      pathname: destinationPath,
    });

    return {
      url: blobUrl,
      pathname: destinationPath,
      contentLength:
        props.contentLength ?? (contentLength ? Number(contentLength) : null),
      contentType: props.contentType ?? contentType,
    };
  }
}
