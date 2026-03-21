"use server";

import { createHmac } from "crypto";

import { logger } from "@/lib/logger";
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { getStorageProvider } from "@/server/services/storage";
import { z } from "zod";

const requestUploadSasSchema = z.object({
  sessionId: z.string().min(1, "sessionId is required"),
  organizationId: z.string().min(1, "organizationId is required"),
});

function getSigningSecret(): string {
  const secret = process.env.UPLOAD_TOKEN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    throw new Error(
      "UPLOAD_TOKEN_SECRET or CRON_SECRET must be set for Azure upload flow",
    );
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export const requestUploadSasAction = authorizedActionClient
  .metadata({
    permissions: { recording: ["create"] },
    name: "request-upload-sas",
    audit: {
      resourceType: "recording",
      action: "get",
      category: "read",
    },
  })
  .schema(requestUploadSasSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;

    if (!user) {
      throw ActionErrors.unauthenticated(
        "User not found",
        "requestUploadSasAction",
      );
    }

    const { sessionId, organizationId } = parsedInput;

    logger.info("Generating SAS upload token for live recording", {
      component: "requestUploadSasAction",
      userId: user.id,
      organizationId,
      sessionId,
    });

    const storage = await getStorageProvider();

    if (!storage.generateClientUploadToken) {
      throw ActionErrors.internal(
        "Client upload not supported by storage provider",
        undefined,
        "requestUploadSasAction",
      );
    }

    const blobPath = `recordings/${organizationId}/${sessionId}.webm`;

    const token = await storage.generateClientUploadToken({
      path: blobPath,
      access: "public",
      contentType: "audio/webm",
    });

    logger.info("Generated SAS token for live recording upload", {
      component: "requestUploadSasAction",
      userId: user.id,
      organizationId,
      sessionId,
      pathname: token.pathname,
    });

    const metadataPayload = JSON.stringify({
      sessionId,
      organizationId,
      userId: user.id,
    });
    const tokenSignature = signPayload(metadataPayload);

    return {
      data: {
        uploadUrl: token.uploadUrl,
        blobUrl: token.blobUrl,
        pathname: token.pathname,
        tokenPayload: metadataPayload,
        tokenSignature,
      },
    };
  });
