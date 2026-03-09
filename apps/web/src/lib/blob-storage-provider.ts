export type BlobStorageProvider = "azure" | "vercel";

export function getBlobStorageProvider(): BlobStorageProvider {
  const raw =
    process.env.BLOB_STORAGE_PROVIDER ??
    process.env.NEXT_PUBLIC_PLATFORM ??
    "vercel";
  return raw === "azure" ? "azure" : "vercel";
}
