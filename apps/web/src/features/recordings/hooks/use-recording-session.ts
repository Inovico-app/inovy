"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { RecordingError } from "../core/recording-session.errors";
import {
  createRecordingSession,
  type CreateRecordingSessionConfig,
} from "../core/recording-session.factory";
import type { RecordingSession } from "../core/recording-session";
import type {
  AudioSource,
  ChunkManifest,
  ConnectionStatus,
  ConsentState,
  FinalizedRecording,
  RecordingSessionState,
  RecordingStatus,
  RecoveredSession,
  StopResult,
  TranscriptSegment,
} from "../core/recording-session.types";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseRecordingSessionReturn {
  status: RecordingStatus;
  duration: number;
  error: RecordingError | null;
  chunkManifest: ChunkManifest;
  transcription: {
    status: ConnectionStatus;
    segments: TranscriptSegment[];
    currentCaption: string | null;
  };
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<StopResult | null>;
  savePartial: () => Promise<FinalizedRecording | null>;
  reset: () => void;
  orphanedSession: RecoveredSession | null;
  recoverOrphanedSession: () => Promise<void>;
  discardOrphanedSession: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Config (immutable after mount)
// ---------------------------------------------------------------------------

export interface UseRecordingSessionConfig {
  projectId: string;
  organizationId: string;
  userId: string;
  audioSource: AudioSource;
  language: string;
  liveTranscriptionEnabled: boolean;
  consent: ConsentState;
}

// ---------------------------------------------------------------------------
// Default state snapshot
// ---------------------------------------------------------------------------

function getDefaultState(): RecordingSessionState {
  return {
    status: "idle",
    duration: 0,
    audioSource: "microphone",
    chunks: {
      sessionId: "",
      totalChunks: 0,
      uploadedChunks: 0,
      pendingChunks: 0,
      totalBytes: 0,
      startedAt: 0,
    },
    transcription: {
      status: "disconnected",
      segments: [],
      currentCaption: null,
    },
    error: null,
    errorIsRecoverable: false,
    warnings: [],
    consent: { consentGiven: false, consentGivenAt: null },
    orphanedSession: null,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRecordingSession(
  config: UseRecordingSessionConfig,
): UseRecordingSessionReturn {
  const sessionRef = useRef<RecordingSession | null>(null);
  const [state, setState] = useState<RecordingSessionState>(getDefaultState);

  // --- Session lifecycle: create on mount, destroy on unmount ---
  // Config is captured at mount time (immutable-config pattern).
  // Remount the component to change config.
  useEffect(() => {
    const sessionConfig: CreateRecordingSessionConfig = {
      projectId: config.projectId,
      organizationId: config.organizationId,
      userId: config.userId,
      audioSource: config.audioSource,
      language: config.language,
      liveTranscriptionEnabled: config.liveTranscriptionEnabled,
      consent: config.consent,
    };

    const session = createRecordingSession(sessionConfig);
    sessionRef.current = session;

    // Subscribe to state changes
    const unsubscribe = session.onStateChange((newState) => {
      setState(newState);
    });

    // Sync initial state
    setState(session.getState());

    return () => {
      unsubscribe();
      session.destroy();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- immutable config at mount
  }, []);

  // --- Check for orphaned sessions on mount ---
  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;

    void session.checkForOrphanedSession();
  }, []);

  // --- Action callbacks ---

  const start = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    await session.start();
  }, []);

  const pause = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    session.pause();
  }, []);

  const resume = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    session.resume();
  }, []);

  const stop = useCallback(async (): Promise<StopResult | null> => {
    const session = sessionRef.current;
    if (!session) return null;

    const finalized = await session.stop();
    if (!finalized) return null;

    return {
      recordingId: "",
      fileUrl: finalized.fileUrl,
      duration: finalized.duration,
    };
  }, []);

  const savePartial =
    useCallback(async (): Promise<FinalizedRecording | null> => {
      const session = sessionRef.current;
      if (!session) return null;

      return session.savePartial();
    }, []);

  const reset = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    session.reset();
  }, []);

  const recoverOrphanedSession = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    await session.recoverOrphanedSession();
  }, []);

  const discardOrphanedSession = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;

    await session.discardOrphanedSession();
  }, []);

  return {
    status: state.status,
    duration: state.duration,
    error: state.error,
    chunkManifest: state.chunks,
    transcription: {
      status: state.transcription.status,
      segments: state.transcription.segments,
      currentCaption: state.transcription.currentCaption,
    },
    start,
    pause,
    resume,
    stop,
    savePartial,
    reset,
    orphanedSession: state.orphanedSession,
    recoverOrphanedSession,
    discardOrphanedSession,
  };
}
