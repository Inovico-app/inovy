import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger, serializeError } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limit";
import { rateLimiter } from "@/server/services/rate-limiter.service";
import { ConsentService } from "@/server/services/consent.service";
import { RecordingService } from "@/server/services/recording.service";
import { EncryptionPolicyService } from "@/server/services/encryption-policy.service";
import { DataClassificationService } from "@/server/services/data-classification.service";
import { type DataClassificationLevel } from "@/server/db/schema/data-classification";
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/server/validation/recordings/upload-recording";
import { convertRecordingIntoAiInsights } from "@/workflows/convert-recording";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
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

          logger.info("Generating client token for recording upload", {
            component: "POST /api/recordings/upload - onBeforeGenerateToken",
            userId: user.id,
            organizationId: organization.id,
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
            organizationId: organization.id,
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
          const authResult = await getBetterAuthSession();
          const _user =
            authResult.isOk() && authResult.value.isAuthenticated
              ? authResult.value.user
              : null;

          // Determine data classification and encryption policy
          const encryptionDecision = await EncryptionPolicyService.determineEncryptionPolicy({
            dataType: "recording",
            organizationId: payload.organizationId,
            metadata: {
              fileName: payload.fileName,
              fileSize: payload.fileSize,
              fileMimeType: payload.fileMimeType,
              projectId: payload.projectId,
              consentGiven: payload.consentGiven,
            },
          });

          let classificationLevel: DataClassificationLevel = "confidential";
          let classificationMetadata: unknown = null;

          if (encryptionDecision.isOk()) {
            const { classification } = encryptionDecision.value;
            classificationLevel = classification.level;
            classificationMetadata = classification.metadata;

            logger.info("Data classification determined", {
              component: "POST /api/recordings/upload - onUploadCompleted",
              classificationLevel: classification.level,
              reason: classification.reason,
            });
          } else {
            logger.warn("Failed to determine classification, using default", {
              component: "POST /api/recordings/upload - onUploadCompleted",
              error: encryptionDecision.error,
            });
          }

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
              dataClassificationLevel: classificationLevel,
              classificationMetadata: classificationMetadata as unknown as Record<
                string,
                unknown
              >,
              classifiedAt: new Date(),
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

          // Store classification in separate table for audit purposes
          if (encryptionDecision.isOk()) {
            await DataClassificationService.storeClassification(
              recording.id,
              "recording",
              encryptionDecision.value.classification,
              payload.organizationId,
              payload.userId
            );
          }

          logger.info("Recording created successfully with classification", {
            component: "POST /api/recordings/upload - onUploadCompleted",
            recordingId: recording.id,
            projectId: payload.projectId,
            recordingMode: payload.recordingMode,
            classificationLevel: recording.dataClassificationLevel,
          });

          // Save participants' consent if provided
          // Note: Never log participant emails or names (PII) - only log counts
          if (payload.participants && payload.participants.length > 0) {
            try {
              const headersList = await headers();
              const ipAddress =
                headersList.get("x-forwarded-for") ||
                headersList.get("x-real-ip") ||
                "unknown";
              const userAgent = headersList.get("user-agent") || "unknown";

              // Grant consent for each participant
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

              // Log only counts, never PII (emails/names)
              if (failed > 0) {
                logger.warn("Some participant consents failed to save", {
                  component: "POST /api/recordings/upload - onUploadCompleted",
                  recordingId: recording.id,
                  total: payload.participants.length,
                  succeeded: successful,
                  failed,
                });
              } else {
                logger.info("All participant consents saved successfully", {
                  component: "POST /api/recordings/upload - onUploadCompleted",
                  recordingId: recording.id,
                  participantCount: payload.participants.length,
                });
              }
            } catch (error) {
              logger.error("Failed to save participant consents", {
                component: "POST /api/recordings/upload - onUploadCompleted",
                recordingId: recording.id,
                error: serializeError(error),
              });
              // Don't throw - consent saving failure shouldn't block recording creation
            }
          }

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
    const authResult = await getBetterAuthSession();
    return authResult.isOk() &&
      authResult.value.isAuthenticated &&
      authResult.value.user
      ? authResult.value.user.id
      : null;
  }
);

// Configure Next.js to handle large file uploads with streaming
export const maxDuration = 300; // 5 minutes for large file uploads

