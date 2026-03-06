import { del, put } from "@vercel/blob";
import type {
  StorageProvider,
  StoragePutOptions,
  StoragePutResult,
} from "./storage.types";

export class VercelStorageProvider implements StorageProvider {
  async put(
    path: string,
    data: File | Buffer | Blob,
    options: StoragePutOptions
  ): Promise<StoragePutResult> {
    const blob = await put(path, data, {
      access: options.access,
      contentType: options.contentType,
      addRandomSuffix: options.addRandomSuffix,
    } as Parameters<typeof put>[2]);

    return { url: blob.url, pathname: blob.pathname };
  }

  async del(url: string): Promise<void> {
    await del(url);
  }
}
