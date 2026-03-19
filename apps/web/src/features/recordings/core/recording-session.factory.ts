/**
 * Recording session factory — the ONLY file that imports concrete service
 * implementations. Everything else uses interfaces.
 *
 * This factory must only be called from client components ("use client").
 */

import type { AudioSource, ConsentState } from "./recording-session.types";
import {
  RecordingSession,
  type RecordingSessionConfig,
  type RecordingSessionDeps,
} from "./recording-session";

import { MicrophoneCaptureService } from "./services/audio-capture/microphone-capture";
import { SystemAudioCaptureService } from "./services/audio-capture/system-audio-capture";
import { CombinedCaptureService } from "./services/audio-capture/combined-capture";
import { ChunkPersistenceServiceImpl } from "./services/chunk-persistence/chunk-persistence";
import { IndexedDBChunkStore } from "./services/chunk-persistence/indexed-db-store";
import { LiveTranscriptionServiceImpl } from "./services/live-transcription/live-transcription";

import type { AudioCaptureService } from "./services/audio-capture/audio-capture.interface";

import { getDeepgramTokenAction } from "../actions/deepgram-token";

// ---------------------------------------------------------------------------
// Factory config
// ---------------------------------------------------------------------------

export interface CreateRecordingSessionConfig {
  projectId: string;
  organizationId: string;
  userId: string;
  audioSource: AudioSource;
  language: string;
  liveTranscriptionEnabled: boolean;
  consent: ConsentState;
}

// ---------------------------------------------------------------------------
// Audio capture service selection
// ---------------------------------------------------------------------------

function createAudioCaptureService(
  audioSource: AudioSource,
): AudioCaptureService {
  switch (audioSource) {
    case "microphone":
      return new MicrophoneCaptureService();
    case "system":
      return new SystemAudioCaptureService();
    case "combined":
      return new CombinedCaptureService();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createRecordingSession(
  config: CreateRecordingSessionConfig,
): RecordingSession {
  const { organizationId, userId } = config;

  // 1. Pick AudioCaptureService based on config.audioSource
  const audioCapture = createAudioCaptureService(config.audioSource);

  // 2. Create ChunkPersistenceServiceImpl with server action callbacks
  //
  // Uses the existing /api/recordings/upload endpoint for both SAS token
  // generation and upload completion — this ensures the HMAC signature
  // covers the full recording metadata (same signing flow as file uploads).
  const store = new IndexedDBChunkStore();

  // The generate-token step returns a signed tokenPayload + tokenSignature
  // that must be sent back verbatim during upload-complete.
  let signedTokenPayload = "";
  let signedTokenSignature = "";

  const chunkPersistence = new ChunkPersistenceServiceImpl(store, {
    requestSasToken: async () => {
      const metadata = {
        projectId: config.projectId,
        title: `Live opname - ${new Date().toLocaleDateString("nl-NL")}`,
        recordingDate: new Date().toISOString(),
        fileName: `live-${config.projectId}-${Date.now()}.webm`,
        fileSize: 0, // Unknown at start — verified server-side after upload
        fileMimeType: "audio/webm",
        recordingMode: "live" as const,
        consentGiven: config.consent.consentGiven,
        consentGivenAt: config.consent.consentGivenAt,
      };

      const response = await fetch("/api/recordings/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-token",
          metadata: JSON.stringify(metadata),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Failed to request upload token",
        );
      }

      const data = (await response.json()) as {
        uploadUrl: string;
        blobUrl: string;
        pathname: string;
        tokenPayload: string;
        tokenSignature: string;
      };

      // Store the signed payload+signature for upload-complete
      signedTokenPayload = data.tokenPayload;
      signedTokenSignature = data.tokenSignature;

      return {
        uploadUrl: data.uploadUrl,
        blobUrl: data.blobUrl,
        pathname: data.pathname,
      };
    },
    onUploadComplete: async (params) => {
      const response = await fetch("/api/recordings/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload-complete",
          blobUrl: params.blobUrl,
          pathname: params.pathname,
          duration: params.duration,
          // Send the EXACT signed payload from generate-token — not a new one
          tokenPayload: signedTokenPayload,
          tokenSignature: signedTokenSignature,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        recordingId?: string;
        success?: boolean;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to process upload completion");
      }

      return { recordingId: data.recordingId ?? "" };
    },
  });

  // 3. Create LiveTranscriptionServiceImpl (if enabled)
  let liveTranscription: LiveTranscriptionServiceImpl | undefined;

  if (config.liveTranscriptionEnabled) {
    liveTranscription = new LiveTranscriptionServiceImpl({
      getToken: async () => {
        const result = await getDeepgramTokenAction();

        if (!result?.data?.data?.token) {
          throw new Error("Failed to obtain Deepgram token");
        }

        return result.data.data.token;
      },
    });
  }

  // 4. Assemble dependencies and config
  const deps: RecordingSessionDeps = {
    audioCapture,
    chunkPersistence,
    liveTranscription,
  };

  const sessionConfig: RecordingSessionConfig = {
    projectId: config.projectId,
    audioSource: config.audioSource,
    language: config.language,
    liveTranscriptionEnabled: config.liveTranscriptionEnabled,
    consent: config.consent,
  };

  return new RecordingSession(deps, sessionConfig);
}
