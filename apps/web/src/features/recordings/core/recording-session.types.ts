import type { Result, ResultAsync } from "neverthrow";

import type { RecordingError } from "./recording-session.errors";

// --- Audio ---

export type AudioSource = "microphone" | "system" | "combined";

export interface AudioChunk {
  data: Blob;
  index: number;
  timestamp: number; // wall-clock ms
  duration: number; // approximate chunk duration ms
}

// --- FSM ---

export type RecordingStatus =
  | "idle"
  | "initializing"
  | "recording"
  | "paused"
  | "stopping"
  | "finalizing"
  | "complete"
  | "error";

export interface ConsentState {
  consentGiven: boolean;
  consentGivenAt: string | null; // ISO timestamp
}

export interface TranscriptionState {
  status: ConnectionStatus;
  segments: TranscriptSegment[];
  currentCaption: string | null;
}

export interface RecordingSessionState {
  status: RecordingStatus;
  duration: number; // seconds elapsed (excludes paused time)
  audioSource: AudioSource;
  chunks: ChunkManifest;
  transcription: TranscriptionState;
  error: RecordingError | null;
  errorIsRecoverable: boolean;
  warnings: RecordingError[];
  consent: ConsentState;
  orphanedSession: RecoveredSession | null;
}

// --- Chunk Persistence ---

export interface ChunkManifest {
  sessionId: string;
  totalChunks: number;
  uploadedChunks: number;
  pendingChunks: number;
  totalBytes: number;
  startedAt: number; // epoch ms
}

export interface FinalizedRecording {
  fileUrl: string;
  fileSize: number;
  duration: number; // seconds
  chunkCount: number;
}

export interface SessionMetadata {
  projectId: string;
  audioSource: AudioSource;
  language: string;
  startedAt: number; // epoch ms
  consent: ConsentState;
}

export interface RecoveredSession {
  sessionId: string;
  manifest: ChunkManifest;
  chunks: AudioChunk[];
  metadata: SessionMetadata;
}

// --- Transcription ---

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed";

export interface TranscriptionConfig {
  model: "nova-3";
  language: string;
  enableDiarization: boolean;
  interimResults: boolean;
}

export interface TranscriptSegment {
  text: string;
  speaker?: number;
  isFinal: boolean;
  confidence: number;
  startTime: number;
  endTime: number;
}

// --- Shared ---

export type Unsubscribe = () => void;

export interface Disposable {
  dispose(): void;
}

// --- Stop Result ---

export interface StopResult {
  recordingId: string;
  fileUrl: string;
  duration: number;
}

// Re-export neverthrow types for convenience
export type { Result, ResultAsync };
