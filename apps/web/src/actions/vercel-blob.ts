"use server";

import { logger } from "@/lib/logger";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getStorageProvider } from "@/server/services/storage";
import { z } from "zod";

const uploadFileInputSchema = z.object({
  file: z.instanceof(File),
});

/**
 * Upload a file to blob storage (Vercel Blob or Azure).
 * Auth and audit logging are handled by the action client middleware.
 */
export const uploadFileToVercelBlobAction = authorizedActionClient
  .metadata({
    name: "upload-file-to-blob",
    permissions: {},
    audit: {
      resourceType: "blob",
      action: "upload",
      category: "mutation",
    },
  })
  .inputSchema(uploadFileInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { file } = parsedInput;
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "upload-file-to-blob",
      );
    }

    logger.info("Uploading file to blob storage", {
      component: "uploadFileToVercelBlobAction",
      userId: user.id,
      fileName: file.name,
    });

    const storage = await getStorageProvider();
    await storage.put(`recordings/${file.name}`, file, {
      access: "public",
    });

    ctx.audit?.setMetadata({ fileName: file.name });
  });
