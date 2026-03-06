"use server";

import { getStorageProvider } from "@/server/services/storage";

export async function uploadFileToVercelBlobAction(file: File) {
  const storage = await getStorageProvider();
  await storage.put(`recordings/${file.name}`, file, {
    access: "public",
  });
}

