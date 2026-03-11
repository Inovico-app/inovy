"use client";

import {
  getSystemAudioErrorInfo,
  type RecordingDeviceErrorInfo,
} from "@/features/recordings/lib/recording-device-errors";
import { logger } from "@/lib/logger";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { toast } from "sonner";
import {
  createInitialState,
  systemAudioReducer,
} from "./system-audio-reducer";

// ============================================================================
// Types & Enums
// ============================================================================

export enum SystemAudioState {
  NotSetup = -1,
  SettingUp = 0,
  Ready = 1,
  Opening = 2,
  Open = 3,
  Error = 4,
  Pausing = 5,
  Paused = 6,
}

interface SystemAudioContextType {
  systemAudio: MediaRecorder | null;
  systemAudioStream: MediaStream | null;
  videoStream: MediaStream | null; // Video track is required by getDisplayMedia
  startSystemAudio: () => void;
  stopSystemAudio: () => void;
  /** Fully releases system audio resources (stops tracks, closes AudioContext, resets state). Use after recording is complete. */
  releaseSystemAudio: () => void;
  /** Resolves when setup completes. Returns success, optional stream, and error info (toast shown on failure, never throws). */
  setupSystemAudio: () => Promise<
    | { success: true; stream: MediaStream }
    | { success: false; error: RecordingDeviceErrorInfo }
  >;
  systemAudioState: SystemAudioState;
  /** User-friendly error info when setup fails */
  setupError: RecordingDeviceErrorInfo | null;
}

interface SystemAudioContextProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const SystemAudioContext = createContext<
  SystemAudioContextType | undefined
>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

const SystemAudioContextProvider: React.FC<
  SystemAudioContextProviderProps
> = ({ children }) => {
  // ==========================================================================
  // State
  // ==========================================================================

  const [state, dispatch] = useReducer(systemAudioReducer, undefined, createInitialState);
  const { systemAudioState, setupError, systemAudio, systemAudioStream, videoStream } = state;

  // ==========================================================================
  // Refs
  // ==========================================================================

  const audioContextRef = useRef<AudioContext | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const systemAudioStreamRef = useRef<MediaStream | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // ==========================================================================
  // Cleanup Helpers
  // ==========================================================================

  const cleanupResources = () => {
    // Stop all tracks - read from refs to avoid stale closures
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (systemAudioStreamRef.current) {
      systemAudioStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch((err) => logger.error("Failed to close audio context", { component: "SystemAudioProvider", error: err instanceof Error ? err : new Error(String(err)) }));
    }

    // Reset all refs when tearing down so future cleanups see correct values
    rawStreamRef.current = null;
    systemAudioStreamRef.current = null;
    videoStreamRef.current = null;
    audioContextRef.current = null;
  };

  // ==========================================================================
  // System Audio Control Methods
  // ==========================================================================

  const setupSystemAudio = async () => {
    dispatch({ type: "SETUP_START" });

    // Cleanup any existing resources before setting up new ones
    cleanupResources();

    try {
      // Check if getDisplayMedia is available
      if (
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getDisplayMedia !== "function"
      ) {
        throw new Error(
          "getDisplayMedia is not supported in this browser. Please use Chrome, Edge, or Opera."
        );
      }

      // Request screen capture with audio
      // Note: video track is required by the API, but we'll hide it
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
        },
      });

      rawStreamRef.current = displayStream;

      // Separate video and audio tracks
      const videoTracks = displayStream.getVideoTracks();
      const audioTracks = displayStream.getAudioTracks();

      // Check if audio track is available
      if (audioTracks.length === 0) {
        displayStream.getTracks().forEach((track) => track.stop());
        throw new Error(
          "No audio track available. Please ensure 'Share system audio' is selected when sharing your screen."
        );
      }

      // Create a new stream with only audio tracks for recording
      const audioOnlyStream = new MediaStream(audioTracks);
      systemAudioStreamRef.current = audioOnlyStream; // Update ref for cleanup

      // Store video stream separately - keep tracks alive but hidden
      let videoOnlyStream: MediaStream | null = null;
      if (videoTracks.length > 0) {
        videoOnlyStream = new MediaStream(videoTracks);

        // Hide video tracks by disabling them instead of stopping
        // This keeps the stream alive and usable while preventing video rendering
        videoTracks.forEach((track) => {
          track.enabled = false;
        });

        videoStreamRef.current = videoOnlyStream; // Update ref for cleanup
      } else {
        videoStreamRef.current = null; // Clear ref if no video tracks
      }

      // Handle track ended events (user stops sharing)
      // Use cleanupResources() + CLEANUP dispatch instead of stopSystemAudio()
      // because tracks are already dead at this point — pause() would fail
      // and the streams can't be reused, so full teardown is needed.
      displayStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          logger.info("Video track ended, cleaning up system audio", { component: "SystemAudioProvider" });
          cleanupResources();
          dispatch({ type: "CLEANUP" });
        };
      });

      displayStream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          logger.info("Audio track ended, cleaning up system audio", { component: "SystemAudioProvider" });
          cleanupResources();
          dispatch({ type: "CLEANUP" });
        };
      });

      // Create MediaRecorder from audio stream
      const mediaRecorder = new MediaRecorder(audioOnlyStream, {
        mimeType: "audio/webm;codecs=opus",
      });

      dispatch({
        type: "SETUP_SUCCESS",
        payload: {
          systemAudio: mediaRecorder,
          systemAudioStream: audioOnlyStream,
          videoStream: videoOnlyStream,
        },
      });
      return { success: true as const, stream: audioOnlyStream };
    } catch (err: unknown) {
      logger.error("Failed to setup system audio", { component: "SystemAudioProvider", error: err instanceof Error ? err : new Error(String(err)) });
      cleanupResources();

      const errorInfo = getSystemAudioErrorInfo(err);
      dispatch({ type: "SETUP_ERROR", payload: errorInfo });

      // Stay on page: show notification instead of error screen
      toast.error(errorInfo.title, {
        description: errorInfo.message,
        duration: 8000,
      });
      return { success: false as const, error: errorInfo };
    }
  };

  const startSystemAudio = () => {
    // Guard against null/undefined systemAudio
    if (!systemAudio) {
      logger.warn("Cannot start system audio: systemAudio is not initialized", { component: "SystemAudioProvider" });
      dispatch({ type: "SET_STATE", payload: SystemAudioState.Error });
      return;
    }

    // Guard: systemAudio must be in Ready state (inactive) or Paused state
    if (
      systemAudio.state !== "inactive" &&
      systemAudio.state !== "paused"
    ) {
      logger.warn(`Cannot start system audio: invalid state ${systemAudio.state}`, { component: "SystemAudioProvider" });
      return;
    }

    try {
      dispatch({ type: "SET_STATE", payload: SystemAudioState.Opening });

      // Set up one-time event listeners for start/resume and error events
      const handleSuccess = () => {
        dispatch({ type: "SET_STATE", payload: SystemAudioState.Open });
        systemAudio.removeEventListener("start", handleStart);
        systemAudio.removeEventListener("resume", handleResume);
        systemAudio.removeEventListener("error", handleError);
      };

      const handleStart = () => handleSuccess();
      const handleResume = () => handleSuccess();

      const handleError = (event: Event) => {
        const errorMessage = event instanceof ErrorEvent ? event.message : String(event);
        logger.error("MediaRecorder error", { component: "SystemAudioProvider", error: event instanceof Error ? event : new Error(errorMessage) });
        toast.error("Systeemaudio fout", {
          description: errorMessage,
          duration: 8000,
        });
        dispatch({ type: "SET_STATE", payload: SystemAudioState.Ready });
        systemAudio.removeEventListener("start", handleStart);
        systemAudio.removeEventListener("resume", handleResume);
        systemAudio.removeEventListener("error", handleError);
      };

      systemAudio.addEventListener("start", handleStart, { once: true });
      systemAudio.addEventListener("resume", handleResume, { once: true });
      systemAudio.addEventListener("error", handleError, { once: true });

      if (systemAudio.state === "paused") {
        systemAudio.resume();
      } else {
        systemAudio.start(250); // Collect data every 250ms
      }
    } catch (error) {
      logger.error("Failed to start system audio", { component: "SystemAudioProvider", error: error instanceof Error ? error : new Error(String(error)) });
      toast.error("Kon systeemaudio niet starten", {
        description: error instanceof Error ? error.message : String(error),
        duration: 8000,
      });
      dispatch({ type: "SET_STATE", payload: SystemAudioState.Ready });
    }
  };

  /**
   * Stops the system audio recording (can be resumed later).
   * Note: This pauses the recording, not stops it completely.
   * For complete cleanup, the component unmount will handle it.
   */
  const stopSystemAudio = () => {
    // Guard against null/undefined systemAudio
    if (!systemAudio) {
      logger.warn("Cannot stop system audio: systemAudio is not initialized", { component: "SystemAudioProvider" });
      return;
    }

    // Guard: only pause if systemAudio is actually recording
    if (systemAudio.state !== "recording") {
      // If already paused or inactive, set state accordingly
      if (systemAudio.state === "paused") {
        dispatch({ type: "SET_STATE", payload: SystemAudioState.Paused });
      } else if (systemAudio.state === "inactive") {
        dispatch({ type: "SET_STATE", payload: SystemAudioState.Ready });
      }
      return;
    }

    try {
      dispatch({ type: "SET_STATE", payload: SystemAudioState.Pausing });
      systemAudio.pause();
      dispatch({ type: "SET_STATE", payload: SystemAudioState.Paused });
    } catch (error) {
      logger.error("Failed to stop system audio", { component: "SystemAudioProvider", error: error instanceof Error ? error : new Error(String(error)) });
      toast.error("Kon systeemaudio niet stoppen", {
        description: error instanceof Error ? error.message : String(error),
        duration: 8000,
      });
      // Revert to previous valid state (was Open before Pausing)
      dispatch({ type: "SET_STATE", payload: SystemAudioState.Open });
    }

    // Note: We don't clean up streams/audio context here because they might be reused
    // For full teardown, use releaseSystemAudio() instead
  };

  /**
   * Fully releases system audio resources (stops tracks, closes AudioContext, resets state).
   * Use after recording is complete — unlike stopSystemAudio() which only pauses.
   */
  const releaseSystemAudio = () => {
    // Stop the MediaRecorder if it's active
    if (systemAudio && systemAudio.state !== "inactive") {
      try {
        systemAudio.stop();
      } catch {
        // Ignore — MediaRecorder may already be in an invalid state
      }
    }

    cleanupResources();
    dispatch({ type: "CLEANUP" });
  };

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Cleanup audio context and streams on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <SystemAudioContext.Provider
      value={{
        systemAudio,
        systemAudioStream,
        videoStream,
        startSystemAudio,
        stopSystemAudio,
        releaseSystemAudio,
        setupSystemAudio,
        systemAudioState,
        setupError,
      }}
    >
      {children}
    </SystemAudioContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

function useSystemAudio(): SystemAudioContextType {
  const context = useContext(SystemAudioContext);

  if (context === undefined) {
    throw new Error(
      "useSystemAudio must be used within a SystemAudioContextProvider"
    );
  }

  return context;
}

export { SystemAudioContextProvider, useSystemAudio };
