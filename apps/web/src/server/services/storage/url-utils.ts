import { getStorageProvider } from "./index";

export function isAzureBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.core.windows.net");
  } catch {
    return false;
  }
}

/**
 * Resolve a blob URL to a fetchable URL.
 * For Azure blobs (public access disabled), returns a read-only SAS URL.
 * For Vercel or other storage, returns the URL as-is.
 */
export async function resolveFetchableUrl(
  url: string,
  expiresInMinutes = 60
): Promise<string> {
  if (!isAzureBlobUrl(url)) {
    return url;
  }
  const storage = await getStorageProvider();
  if (storage.generateReadSasUrl) {
    return storage.generateReadSasUrl(url, expiresInMinutes);
  }
  return url;
}
