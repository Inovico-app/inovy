export type BlobStorageProvider = "azure" | "vercel";

export function getBlobStorageProvider(): BlobStorageProvider {
  const raw = process.env.BLOB_STORAGE_PROVIDER ?? "vercel";
  return raw === "azure" ? "azure" : "vercel";
}
