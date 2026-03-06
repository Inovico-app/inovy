import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { randomUUID } from "crypto";
import path from "path";
import type {
  BlobProperties,
  ClientUploadOptions,
  ClientUploadToken,
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
    _blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return _blobServiceClient;
}

function getSharedKeyCredential(): StorageSharedKeyCredential {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  if (!accountName || !accountKey) {
    throw new Error(
      "AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY are required for SAS token generation"
    );
  }
  return new StorageSharedKeyCredential(accountName, accountKey);
}

function getContainerName(access: "public" | "private"): string {
  return access === "public"
    ? (process.env.AZURE_STORAGE_PUBLIC_CONTAINER ?? "public")
    : (process.env.AZURE_STORAGE_PRIVATE_CONTAINER ?? "private");
}

export class AzureStorageProvider implements StorageProvider {
  async put(
    blobPath: string,
    data: File | Buffer | Blob,
    options: StoragePutOptions
  ): Promise<StoragePutResult> {
    const client = getClient();
    const containerName = getContainerName(options.access);
    const containerClient = client.getContainerClient(containerName);

    let finalPath = blobPath;
    if (options.addRandomSuffix) {
      const ext = path.extname(blobPath);
      const base = blobPath.slice(0, -ext.length || undefined);
      finalPath = `${base}-${randomUUID().slice(0, 8)}${ext}`;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(finalPath);

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
      url: blockBlobClient.url,
      pathname: finalPath,
    };
  }

  async del(url: string): Promise<void> {
    const client = getClient();

    const blobUrl = new URL(url);
    const pathParts = blobUrl.pathname.split("/").filter(Boolean);
    const containerName = pathParts[0]!;
    const blobName = pathParts.slice(1).join("/");

    const containerClient = client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    await blobClient.deleteIfExists();
  }

  async getBlobProperties(url: string): Promise<BlobProperties> {
    const client = getClient();

    const blobUrl = new URL(url);
    const pathParts = blobUrl.pathname.split("/").filter(Boolean);
    const containerName = pathParts[0]!;
    const blobName = pathParts.slice(1).join("/");

    const containerClient = client.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);
    const props = await blobClient.getProperties();

    return {
      contentLength: props.contentLength,
      contentType: props.contentType,
    };
  }

  async generateClientUploadToken(
    options: ClientUploadOptions
  ): Promise<ClientUploadToken> {
    const credential = getSharedKeyCredential();
    const containerName = getContainerName(options.access);
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;

    const finalPath = `${options.path}-${randomUUID().slice(0, 8)}${path.extname(options.path)}`;

    const expiresOn = new Date();
    expiresOn.setMinutes(
      expiresOn.getMinutes() + (options.expiresInMinutes ?? 30)
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName: finalPath,
        permissions: BlobSASPermissions.parse("cw"), // create + write
        startsOn: new Date(),
        expiresOn,
        contentType: options.contentType,
      },
      credential
    ).toString();

    const blobUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${finalPath}`;

    return {
      uploadUrl: `${blobUrl}?${sasToken}`,
      blobUrl,
      pathname: finalPath,
    };
  }
}

