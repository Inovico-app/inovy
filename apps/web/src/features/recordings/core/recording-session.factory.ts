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
import { requestUploadSasAction } from "../actions/request-upload-sas";

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
  const store = new IndexedDBChunkStore();

  // Track the SAS token response for use in onUploadComplete
  let sasTokenSignature = "";

  const chunkPersistence = new ChunkPersistenceServiceImpl(store, {
    requestSasToken: async () => {
      const result = await requestUploadSasAction({
        sessionId: crypto.randomUUID(),
        organizationId,
      });

      if (!result?.data?.data) {
        throw new Error("Failed to request SAS token");
      }

      // Store the token signature for use in onUploadComplete
      sasTokenSignature = result.data.data.tokenSignature;

      return {
        uploadUrl: result.data.data.uploadUrl,
        blobUrl: result.data.data.blobUrl,
        pathname: result.data.data.pathname,
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
          tokenPayload: JSON.stringify({
            projectId: params.metadata.projectId,
            title: `Live Recording - ${new Date(params.metadata.startedAt).toLocaleDateString()}`,
            recordingDate: new Date(params.metadata.startedAt).toISOString(),
            fileName: `${params.metadata.projectId}-live.webm`,
            fileSize: params.fileSize,
            fileMimeType: "audio/webm",
            recordingMode: "live" as const,
            userId,
            organizationId,
            consentGiven: params.metadata.consent.consentGiven,
            consentGivenAt: params.metadata.consent.consentGivenAt,
          }),
          tokenSignature: sasTokenSignature,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        recordingId?: string;
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
