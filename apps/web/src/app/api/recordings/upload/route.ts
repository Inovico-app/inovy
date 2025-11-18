import { logger, serializeError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { RecordingService } from "@/server/services";
import { rateLimiter } from "@/server/services/rate-limiter.service";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

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
}

interface TokenPayload extends UploadMetadata {
  userId: string;
  organizationId: string;
}

/**
 * POST /api/recordings/upload
 * Handles Vercel Blob client uploads with token-based security
 *
 * This endpoint serves two purposes:
 * 1. Generate client tokens for browser->Blob uploads (onBeforeGenerateToken)
 * 2. Handle post-upload logic when upload completes (onUploadCompleted)
 */
export const POST = withRateLimit(
  async (request: NextRequest) => {
    try {
      const body = (await request.json()) as HandleUploadBody;

      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          // Authenticate user
          const { getUser, getOrganization } = getKindeServerSession();
          const user = await getUser();
          const organization = await getOrganization();

          if (!user || !organization) {
            throw new Error("Unauthorized");
          }

          logger.info("Generating client token for recording upload", {
            component: "POST /api/recordings/upload - onBeforeGenerateToken",
            userId: user.id,
            organizationId: organization.orgCode,
            pathname,
          });

          // Parse and validate metadata from client
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

          if (
            !metadata?.projectId ||
            !metadata?.title ||
            !metadata?.recordingDate ||
            !metadata?.fileName ||
            !metadata?.fileSize ||
            !metadata?.fileMimeType
          ) {
            throw new Error(
              "Missing required metadata: projectId, title, recordingDate, fileName, fileSize, or fileMimeType"
            );
          }

          // Store metadata in tokenPayload for onUploadCompleted
          const tokenPayload: TokenPayload = {
            ...metadata,
            userId: user.id,
            organizationId: organization.orgCode,
          };

          return {
            allowedContentTypes: ALLOWED_MIME_TYPES as unknown as string[],
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: true,
            callbackUrl: `${request.url}`, // TODO: add callback url so that we can trigger a webhook workflow instead of onUploadCompleted
            tokenPayload: JSON.stringify(tokenPayload),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          logger.info("Upload completed, processing recording", {
            component: "POST /api/recordings/upload - onUploadCompleted",
            blobPathname: blob.pathname,
          });

          // Parse token payload
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

          // Get user info for consent tracking
          // Note: user is not currently used but may be needed for future consent tracking
          const { getUser } = getKindeServerSession();
          const _user = await getUser();

          const result = await RecordingService.createRecording(
            {
              projectId: payload.projectId,
              title: payload.title,
              description: payload.description ?? null,
              fileUrl: blob.url,
              fileName: payload.fileName,
              fileSize: payload.fileSize,
              fileMimeType: payload.fileMimeType,
              duration: null, // Will be extracted later
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
              component: "POST /api/recordings/upload - onUploadCompleted",
              error: {
                code: result.error.code,
                message: result.error.message,
                cause: serializeError(result.error.cause),
                context: result.error.context,
              },
            });
            throw new Error("Failed to create recording");
          }

          const recording = result.value;

          logger.info("Recording created successfully", {
            component: "POST /api/recordings/upload - onUploadCompleted",
            recordingId: recording.id,
            projectId: payload.projectId,
            recordingMode: payload.recordingMode,
          });

          // Revalidate the project page
          revalidatePath(`/projects/${payload.projectId}`);

          // Trigger AI processing workflow in the background (fire and forget)
          const workflowRun = await start(convertRecordingIntoAiInsights, [
            recording.id,
          ]);

          logger.info(
            "AI processing workflow triggered from upload recording",
            {
              component: "POST /api/recordings/upload - onUploadCompleted",
              recordingId: recording.id,
              run: {
                id: workflowRun.runId,
                name: workflowRun.workflowName,
                status: workflowRun.status,
              },
            }
          );
        },
      });

      return NextResponse.json(jsonResponse);
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
        { status: 400 } // The webhook will retry 5 times waiting for a 200
      );
    }
  },
  {
    maxRequests: async (userId: string) => {
      const tier = await rateLimiter.getUserTier(userId);
      return tier === "free" ? 10 : 100;
    },
    windowSeconds: 3600, // 1 hour
  },
  async (_request) => {
    // Custom user ID extraction for rate limiting
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    return user?.id ?? null;
  }
);

// Configure Next.js to handle large file uploads with streaming
export const maxDuration = 300; // 5 minutes for large file uploads

