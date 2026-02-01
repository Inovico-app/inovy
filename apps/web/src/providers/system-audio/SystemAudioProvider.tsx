"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

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
  setupSystemAudio: () => Promise<void>;
  systemAudioState: SystemAudioState;
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

  const [systemAudioState, setSystemAudioState] = useState<SystemAudioState>(
    SystemAudioState.NotSetup
  );
  const [systemAudio, setSystemAudio] = useState<MediaRecorder | null>(null);
  const [systemAudioStream, setSystemAudioStream] =
    useState<MediaStream | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // ==========================================================================
  // Refs
  // ==========================================================================

  const audioContextRef = useRef<AudioContext | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  // ==========================================================================
  // Cleanup Helpers
  // ==========================================================================

  const cleanupResources = () => {
    // Stop all tracks
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (systemAudioStream) {
      systemAudioStream.getTracks().forEach((track) => track.stop());
    }
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
    }

    // Reset refs
    rawStreamRef.current = null;
    audioContextRef.current = null;
  };

  // ==========================================================================
  // System Audio Control Methods
  // ==========================================================================

  const setupSystemAudio = async () => {
    setSystemAudioState(SystemAudioState.SettingUp);

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
        // User might have selected a screen without audio
        // Stop the stream and throw error
        displayStream.getTracks().forEach((track) => track.stop());
        throw new Error(
          "No audio track available. Please ensure 'Share system audio' is selected when sharing your screen."
        );
      }

      // Create a new stream with only audio tracks for recording
      const audioOnlyStream = new MediaStream(audioTracks);
      setSystemAudioStream(audioOnlyStream);

      // Store video stream separately (we'll hide it but need to keep it alive)
      if (videoTracks.length > 0) {
        const videoOnlyStream = new MediaStream(videoTracks);
        setVideoStream(videoOnlyStream);

        // Hide video track by stopping it (but keep the stream reference)
        // Actually, we should keep video track alive but hidden
        // Stopping it might stop the entire stream
      }

      // Handle track ended events (user stops sharing)
      displayStream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          console.log("Video track ended, stopping system audio");
          stopSystemAudio();
        };
      });

      displayStream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.log("Audio track ended, stopping system audio");
          stopSystemAudio();
        };
      });

      // Create MediaRecorder from audio stream
      const mediaRecorder = new MediaRecorder(audioOnlyStream, {
        mimeType: "audio/webm;codecs=opus",
      });

      setSystemAudioState(SystemAudioState.Ready);
      setSystemAudio(mediaRecorder);
    } catch (err: unknown) {
      console.error("Failed to setup system audio:", err);
      cleanupResources();
      setSystemAudioState(SystemAudioState.Error);
      throw err;
    }
  };

  const startSystemAudio = () => {
    // Guard against null/undefined systemAudio
    if (!systemAudio) {
      console.warn(
        "Cannot start system audio: systemAudio is not initialized"
      );
      setSystemAudioState(SystemAudioState.Error);
      return;
    }

    // Guard: systemAudio must be in Ready state (inactive) or Paused state
    if (
      systemAudio.state !== "inactive" &&
      systemAudio.state !== "paused"
    ) {
      console.warn(
        `Cannot start system audio: invalid state ${systemAudio.state}`
      );
      return;
    }

    try {
      setSystemAudioState(SystemAudioState.Opening);

      // Set up one-time event listeners for start/resume and error events
      const handleSuccess = () => {
        setSystemAudioState(SystemAudioState.Open);
        systemAudio.removeEventListener("start", handleStart);
        systemAudio.removeEventListener("resume", handleResume);
        systemAudio.removeEventListener("error", handleError);
      };

      const handleStart = () => handleSuccess();
      const handleResume = () => handleSuccess();

      const handleError = (event: Event) => {
        console.error("MediaRecorder error:", event);
        setSystemAudioState(SystemAudioState.Ready);
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
      console.error("Failed to start system audio:", error);
      setSystemAudioState(SystemAudioState.Ready);
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
      console.warn(
        "Cannot stop system audio: systemAudio is not initialized"
      );
      return;
    }

    // Guard: only pause if systemAudio is actually recording
    if (systemAudio.state !== "recording") {
      // If already paused or inactive, set state accordingly
      if (systemAudio.state === "paused") {
        setSystemAudioState(SystemAudioState.Paused);
      } else if (systemAudio.state === "inactive") {
        setSystemAudioState(SystemAudioState.Ready);
      }
      return;
    }

    try {
      setSystemAudioState(SystemAudioState.Pausing);
      systemAudio.pause();
      setSystemAudioState(SystemAudioState.Paused);
    } catch (error) {
      console.error("Failed to stop system audio:", error);
      // Revert to previous valid state (was Open before Pausing)
      setSystemAudioState(SystemAudioState.Open);
    }

    // Note: We don't clean up streams/audio context here because they might be reused
    // Cleanup happens in useEffect cleanup on unmount
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
        setupSystemAudio,
        systemAudioState,
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
