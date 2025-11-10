"use server";

import { put as putBlob } from "@vercel/blob";

export async function uploadFileToVercelBlobAction(file: File) {
  // Upload to Vercel Blob
  await putBlob(`recordings/${file.name}`, file, {
    access: "public",
  });
}

