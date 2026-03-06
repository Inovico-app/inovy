import { platform } from "@/lib/platform";
import type { StorageProvider } from "./storage.types";

let _providerPromise: Promise<StorageProvider> | null = null;

export function getStorageProvider(): Promise<StorageProvider> {
  if (!_providerPromise) {
    _providerPromise = (async () => {
      if (platform === "azure") {
        const { AzureStorageProvider } = await import("./azure.storage");
        return new AzureStorageProvider();
      }
      const { VercelStorageProvider } = await import("./vercel.storage");
      return new VercelStorageProvider();
    })();
  }
  return _providerPromise;
}

export { isAzureBlobUrl, resolveFetchableUrl } from "./url-utils";
export type {
  ClientUploadOptions,
  ClientUploadToken,
  StorageProvider,
  StoragePutOptions,
  StoragePutResult,
} from "./storage.types";

