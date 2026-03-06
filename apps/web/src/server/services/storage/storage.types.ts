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

export interface StorageProvider {
  put(
    path: string,
    data: File | Buffer | Blob,
    options: StoragePutOptions
  ): Promise<StoragePutResult>;

  del(url: string): Promise<void>;

  /**
   * Generate a client upload token for direct browser-to-storage uploads.
   * Only used by Azure (Vercel uses its own handleUpload flow).
   */
  generateClientUploadToken?(
    options: ClientUploadOptions
  ): Promise<ClientUploadToken>;
}
