import { createHmac, timingSafeEqual } from "crypto";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { getBlobStorageProvider } from "@/lib/blob-storage-provider";
import { withRateLimit } from "@/lib/rate-limit";
import { ProjectQueries } from "@/server/data-access/projects.queries";
import { ConsentService } from "@/server/services/consent.service";
import { rateLimiter } from "@/server/services/rate-limiter.service";
import { RecordingService } from "@/server/services/recording.service";
import { getStorageProvider } from "@/server/services/storage";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import type { HandleUploadBody } from "@vercel/blob/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

interface Participant {
  email: string;
  name?: string;
}

interface UploadMetadata {
  projectId: string;
  title: string;
  description?: string;
  recordingDate: string;
  recordingMode: "live" | "upload";
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  consentGiven?: boolean;
  consentGivenAt?: string;
  participants?: Participant[];
}

interface TokenPayload extends UploadMetadata {
  userId: string;
  organizationId: string;
}

function getSigningSecret(): string {
  const secret = process.env.UPLOAD_TOKEN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("UPLOAD_TOKEN_SECRET or CRON_SECRET must be set for Azure upload flow");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

function verifySignedPayload(payload: string, signature: string): boolean {
  const expected = signPayload(payload);
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503];

function isRetryableError(err: unknown): boolean {
  const statusCode = (err as { statusCode?: number }).statusCode;
  if (statusCode == null) return true; // Network/timeout – retry
  if (RETRYABLE_STATUS_CODES.includes(statusCode)) return true;
  return false;
}

async function getBlobPropertiesWithRetry(
  getBlobProperties: (url: string) => Promise<{ contentLength?: number; contentType?: string }>,
  blobUrl: string,
  maxAttempts = 3
): Promise<{ contentLength?: number; contentType?: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await getBlobProperties(blobUrl);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryableError(err)) throw err;
      const delayMs = 500 * Math.pow(2, attempt - 1);
      logger.info("Retrying getBlobProperties after transient error", {
        component: "POST /api/recordings/upload - getBlobPropertiesWithRetry",
        attempt,
        maxAttempts,
        delayMs,
        error: serializeError(err),
      });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

/**
 * Shared post-upload processing: create recording, save consent, trigger AI workflow
 */
async function processUploadCompleted(
  blobUrl: string,
  blobPathname: string,
  payload: TokenPayload
) {
  logger.info("Upload completed, processing recording", {
    component: "POST /api/recordings/upload - processUploadCompleted",
    blobPathname,
  });

  const result = await RecordingService.createRecording(
    {
      projectId: payload.projectId,
      title: payload.title,
      description: payload.description ?? null,
      fileUrl: blobUrl,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      fileMimeType: payload.fileMimeType,
      duration: null,
      recordingDate: new Date(payload.recordingDate),
      recordingMode: payload.recordingMode,
      transcriptionStatus: "pending",
      transcriptionText: null,
      organizationId: payload.organizationId,
      createdById: payload.userId,
      consentGiven: payload.consentGiven ?? false,
      consentGivenBy: payload.consentGiven ? payload.userId : null,
      consentGivenAt:
        payload.consentGiven && payload.consentGivenAt
          ? new Date(payload.consentGivenAt)
          : null,
    },
    false
  );

  if (result.isErr()) {
    logger.error("Failed to create recording in database", {
      component: "POST /api/recordings/upload - processUploadCompleted",
      error: {
        code: result.error.code,
        message: result.error.message,
        cause: serializeError(result.error.cause),
        context: result.error.context,
      },
    });
    throw new Error(
      result.error.code === "FORBIDDEN"
        ? result.error.message
        : "Failed to create recording"
    );
  }

  const recording = result.value;

  logger.info("Recording created successfully", {
    component: "POST /api/recordings/upload - processUploadCompleted",
    recordingId: recording.id,
    projectId: payload.projectId,
    recordingMode: payload.recordingMode,
  });

  // Save participants' consent if provided
  if (payload.participants && payload.participants.length > 0) {
    try {
      const headersList = await headers();
      const ipAddress =
        headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        "unknown";
      const userAgent = headersList.get("user-agent") || "unknown";

      const consentResults = await Promise.allSettled(
        payload.participants.map((participant) =>
          ConsentService.grantConsent(
            recording.id,
            participant.email,
            participant.name,
            "explicit",
            payload.userId,
            payload.organizationId,
            ipAddress,
            userAgent
          )
        )
      );

      const successful = consentResults.filter(
        (r) => r.status === "fulfilled" && r.value.isOk()
      ).length;
      const failed = consentResults.length - successful;

      if (failed > 0) {
        logger.warn("Some participant consents failed to save", {
          component: "POST /api/recordings/upload - processUploadCompleted",
          recordingId: recording.id,
          total: payload.participants.length,
          succeeded: successful,
          failed,
        });
      } else {
        logger.info("All participant consents saved successfully", {
          component: "POST /api/recordings/upload - processUploadCompleted",
          recordingId: recording.id,
          participantCount: payload.participants.length,
        });
      }
    } catch (error) {
      logger.error("Failed to save participant consents", {
        component: "POST /api/recordings/upload - processUploadCompleted",
        recordingId: recording.id,
        error: serializeError(error),
      });
    }
  }

  revalidatePath(`/projects/${payload.projectId}`);

  try {
    const workflowRun = await start(convertRecordingIntoAiInsights, [
      recording.id,
    ]);

    logger.info("AI processing workflow triggered from upload recording", {
      component: "POST /api/recordings/upload - processUploadCompleted",
      recordingId: recording.id,
      run: {
        id: workflowRun.runId,
        name: workflowRun.workflowName,
        status: workflowRun.status,
      },
    });
  } catch (error) {
    logger.error("Failed to trigger AI processing workflow", {
      component: "POST /api/recordings/upload - processUploadCompleted",
      recordingId: recording.id,
      error: serializeError(error),
    });
  }
}

/**
 * Validate metadata and authenticate user.
 * Returns the token payload with user/org info.
 */
async function validateAndAuthenticate(
  metadata: UploadMetadata
): Promise<TokenPayload> {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.user ||
    !authResult.value.organization
  ) {
    throw new Error("Unauthorized");
  }

  const { user, organization } = authResult.value;

  if (
    !metadata.projectId ||
    !metadata.title ||
    !metadata.recordingDate ||
    !metadata.fileName ||
    !metadata.fileSize ||
    !metadata.fileMimeType
  ) {
    throw new Error(
      "Missing required metadata: projectId, title, recordingDate, fileName, fileSize, or fileMimeType"
    );
  }

  if (
    !ALLOWED_MIME_TYPES.includes(
      metadata.fileMimeType as (typeof ALLOWED_MIME_TYPES)[number]
    )
  ) {
    throw new Error(
      `Unsupported file type: ${metadata.fileMimeType}`
    );
  }

  const project = await ProjectQueries.findById(
    metadata.projectId,
    organization.id
  );
  if (!project) {
    throw new Error("Project not found");
  }
  if (project.status === "archived") {
    throw new Error("Cannot add recordings to an archived project");
  }

  return {
    ...metadata,
    userId: user.id,
    organizationId: organization.id,
  };
}

/**
 * Handle Vercel Blob client uploads (original flow)
 */
async function handleVercelUpload(request: NextRequest) {
  const { handleUpload } = await import("@vercel/blob/client");
  const body = (await request.json()) as HandleUploadBody;

  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      let metadata: UploadMetadata | null = null;
      try {
        if (clientPayload) {
          metadata = JSON.parse(clientPayload) as UploadMetadata;
        }
      } catch (error) {
        logger.error("Failed to parse clientPayload", {
          component: "POST /api/recordings/upload - onBeforeGenerateToken",
          error: serializeError(error),
          clientPayload,
        });
        throw new Error("Invalid metadata format");
      }

      if (!metadata) {
        throw new Error("Missing upload metadata");
      }

      const tokenPayload = await validateAndAuthenticate(metadata);

      logger.info("Generating client token for recording upload", {
        component: "POST /api/recordings/upload - onBeforeGenerateToken",
        userId: tokenPayload.userId,
        organizationId: tokenPayload.organizationId,
        pathname,
      });

      return {
        allowedContentTypes: ALLOWED_MIME_TYPES as unknown as string[],
        maximumSizeInBytes: MAX_FILE_SIZE,
        addRandomSuffix: true,
        callbackUrl: `${request.url}`,
        tokenPayload: JSON.stringify(tokenPayload),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      let payload: TokenPayload;
      try {
        payload = JSON.parse(tokenPayload ?? "{}") as TokenPayload;
      } catch (error) {
        logger.error("Failed to parse tokenPayload in onUploadCompleted", {
          component: "POST /api/recordings/upload - onUploadCompleted",
          error: serializeError(error),
          tokenPayload,
        });
        throw new Error("Invalid token payload");
      }

      await processUploadCompleted(blob.url, blob.pathname, payload);
    },
  });

  return NextResponse.json(jsonResponse);
}

/**
 * Handle Azure uploads via SAS token flow.
 *
 * Two actions:
 * - "generate-token": Validates metadata, generates SAS upload URL
 * - "upload-complete": Called by client after direct upload to Azure, triggers post-processing
 */
async function handleAzureUpload(request: NextRequest) {
  const body = (await request.json()) as {
    action: "generate-token" | "upload-complete";
    metadata?: string;
    blobUrl?: string;
    pathname?: string;
    tokenPayload?: string;
    tokenSignature?: string;
  };

  if (body.action === "generate-token") {
    let metadata: UploadMetadata;
    try {
      metadata = JSON.parse(body.metadata ?? "{}") as UploadMetadata;
    } catch {
      throw new Error("Invalid metadata format");
    }

    const tokenPayload = await validateAndAuthenticate(metadata);

    const storage = await getStorageProvider();
    if (!storage.generateClientUploadToken) {
      throw new Error("Client upload not supported by storage provider");
    }

    const token = await storage.generateClientUploadToken({
      path: `recordings/${Date.now()}-${metadata.fileName}`,
      access: "public",
      contentType: metadata.fileMimeType,
      maxSizeInBytes: MAX_FILE_SIZE,
    });

    logger.info("Generated Azure SAS token for recording upload", {
      component: "POST /api/recordings/upload - generate-token",
      userId: tokenPayload.userId,
      organizationId: tokenPayload.organizationId,
      pathname: token.pathname,
    });

    const serializedPayload = JSON.stringify(tokenPayload);
    const tokenSignature = signPayload(serializedPayload);

    return NextResponse.json({
      uploadUrl: token.uploadUrl,
      blobUrl: token.blobUrl,
      pathname: token.pathname,
      tokenPayload: serializedPayload,
      tokenSignature,
    });
  }

  if (body.action === "upload-complete") {
    if (!body.blobUrl || !body.tokenPayload || !body.tokenSignature) {
      throw new Error("Missing blobUrl, tokenPayload, or tokenSignature");
    }

    if (!verifySignedPayload(body.tokenPayload, body.tokenSignature)) {
      throw new Error("Invalid token signature — payload may have been tampered with");
    }

    let payload: TokenPayload;
    try {
      payload = JSON.parse(body.tokenPayload) as TokenPayload;
    } catch {
      throw new Error("Invalid token payload");
    }

    // Verify uploaded blob size doesn't exceed limit (best-effort; proceed if verification fails)
    const storage = await getStorageProvider();
    if (storage.getBlobProperties) {
      try {
        const props = await getBlobPropertiesWithRetry(
          storage.getBlobProperties.bind(storage),
          body.blobUrl
        );
        if (props?.contentLength && props.contentLength > MAX_FILE_SIZE) {
          await storage.del(body.blobUrl);
          throw new Error(
            `Uploaded file exceeds maximum size of ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
          );
        }
      } catch (verifyError) {
        logger.warn("Could not verify blob size after upload; proceeding anyway", {
          component: "POST /api/recordings/upload - upload-complete",
          blobUrl: body.blobUrl,
          error: serializeError(verifyError),
        });
      }
    }

    await processUploadCompleted(body.blobUrl, body.pathname ?? "", payload);

    return NextResponse.json({ success: true });
  }

  throw new Error(`Unknown action: ${body.action}`);
}

/**
 * POST /api/recordings/upload
 * Platform-aware client upload handler
 */
export const POST = withRateLimit(
  async (request: NextRequest) => {
    try {
      if (getBlobStorageProvider() === "azure") {
        return await handleAzureUpload(request);
      }
      return await handleVercelUpload(request);
    } catch (error) {
      logger.error("Error in POST /api/recordings/upload", {
        component: "POST /api/recordings/upload",
        error: serializeError(error),
      });

      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
        { status: 400 }
      );
    }
  },
  {
    maxRequests: async (userId: string) => {
      const tier = await rateLimiter.getUserTier(userId);
      return tier === "free" ? 10 : 100;
    },
    windowSeconds: 3600,
  },
  async (_request) => {
    const authResult = await getBetterAuthSession();
    return authResult.isOk() &&
      authResult.value.isAuthenticated &&
      authResult.value.user
      ? authResult.value.user.id
      : null;
  }
);

export const maxDuration = 300;

