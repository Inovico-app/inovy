export interface StoragePutOptions {
  access: "public" | "private";
  contentType?: string;
  addRandomSuffix?: boolean;
}

export interface StoragePutResult {
  url: string;
  pathname: string;
}

export interface ClientUploadToken {
  /** The URL the client should upload to (Azure SAS URL) */
  uploadUrl: string;
  /** The final blob URL after upload completes */
  blobUrl: string;
  /** The blob pathname */
  pathname: string;
}

export interface ClientUploadOptions {
  path: string;
  access: "public" | "private";
  contentType?: string;
  maxSizeInBytes?: number;
  /** Token expiry in minutes (default: 30) */
  expiresInMinutes?: number;
}

export interface BlobProperties {
  contentLength?: number;
  contentType?: string;
}

export interface CopyFromUrlResult {
  url: string;
  pathname: string;
  contentLength: number | null;
  contentType: string | null;
}

export interface StorageProvider {
  put(
    path: string,
    data: File | Buffer | Blob,
    options: StoragePutOptions,
  ): Promise<StoragePutResult>;

  del(url: string): Promise<void>;

  /**
   * Get blob properties (size, content type) by URL.
   * Used to verify uploaded file size after client-side uploads.
   * When pathname is provided, uses (container, pathname) for lookup to avoid URL encoding issues.
   */
  getBlobProperties?(
    url: string,
    options?: { pathname?: string },
  ): Promise<BlobProperties>;

  /**
   * Generate a client upload token for direct browser-to-storage uploads.
   * Only used by Azure (Vercel uses its own handleUpload flow).
   */
  generateClientUploadToken?(
    options: ClientUploadOptions,
  ): Promise<ClientUploadToken>;

  /**
   * Generate a read-only signed URL for a blob.
   * Required for Azure when public access is disabled; Vercel blob URLs are typically public.
   */
  generateReadSasUrl?(
    blobUrl: string,
    expiresInMinutes?: number,
  ): Promise<string>;

  /**
   * Copy a blob from an external URL via streaming download→upload.
   * The data streams through the Node.js process with bounded memory (~16MB).
   */
  copyFromURL?(
    sourceUrl: string,
    destinationPath: string,
    options?: { access?: "public" | "private" },
  ): Promise<CopyFromUrlResult>;
}
