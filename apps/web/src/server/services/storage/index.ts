import type { StorageProvider } from "./storage.types";

const platform = process.env.PLATFORM ?? "vercel";

let _provider: StorageProvider | null = null;

export async function getStorageProvider(): Promise<StorageProvider> {
  if (_provider) return _provider;

  if (platform === "azure") {
    const { AzureStorageProvider } = await import("./azure.storage");
    _provider = new AzureStorageProvider();
  } else {
    const { VercelStorageProvider } = await import("./vercel.storage");
    _provider = new VercelStorageProvider();
  }

  return _provider;
}

export type {
  ClientUploadOptions,
  ClientUploadToken,
  StorageProvider,
  StoragePutOptions,
  StoragePutResult,
} from "./storage.types";

