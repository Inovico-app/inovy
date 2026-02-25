"use client";

import {
  getRecordingDeviceErrorInfo,
  type RecordingDeviceErrorInfo,
} from "@/features/recordings/lib/recording-device-errors";
import { getMicrophoneGainPreferenceClient } from "@/features/recordings/lib/microphone-gain-preferences";
import {
  getMicrophoneDevicePreferenceClient,
  setMicrophoneDevicePreferenceClient,
} from "@/features/recordings/lib/microphone-device-preferences";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  cleanupAudioProcessor,
  createAudioProcessor,
  updateGain,
} from "./microphone-audio-processor";
import {
  AUDIO_CONSTRAINTS,
  MAX_GAIN,
  MEDIA_RECORDER_TIMESLICE,
  MIN_GAIN,
} from "./microphone-constants";

// ============================================================================
// Types & Enums
// ============================================================================

export enum MicrophoneEvents {
  DataAvailable = "dataavailable",
  Error = "error",
  Pause = "pause",
  Resume = "resume",
  Start = "start",
  Stop = "stop",
}

export enum MicrophoneState {
  NotSetup = -1,
  SettingUp = 0,
  Ready = 1,
  Opening = 2,
  Open = 3,
  Error = 4,
  Pausing = 5,
  Paused = 6,
}

interface MicrophoneContextType {
  microphone: MediaRecorder | null;
  stream: MediaStream | null;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  /** Resolves when setup completes. Returns success, optional stream, and error info (toast shown on failure, never throws). */
  setupMicrophone: () => Promise<
    | { success: true; stream: MediaStream }
    | { success: false; error: RecordingDeviceErrorInfo }
  >;
  microphoneState: MicrophoneState | null;
  /** User-friendly error info when setup fails (e.g. permission denied, device not found) */
  setupError: RecordingDeviceErrorInfo | null;
  gain: number;
  setGain: (gain: number) => void;
  deviceId: string | null;
  setDeviceId: (deviceId: string | null) => void;
}

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context
// ============================================================================

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(
  undefined
);

// ============================================================================
// Provider Component
// ============================================================================

const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = ({
  children,
}) => {
  // ==========================================================================
  // State
  // ==========================================================================

  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>(
    MicrophoneState.NotSetup
  );
  const [setupError, setSetupError] = useState<RecordingDeviceErrorInfo | null>(
    null
  );
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [gain, setGainState] = useState<number>(() =>
    getMicrophoneGainPreferenceClient()
  );
  const [deviceId, setDeviceIdState] = useState<string | null>(() =>
    getMicrophoneDevicePreferenceClient()
  );

  // ==========================================================================
  // Refs
  // ==========================================================================

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  // ==========================================================================
  // Cleanup Helpers
  // ==========================================================================

  const cleanupResources = () => {
    // Only cleanup if resources exist
    if (
      audioContextRef.current &&
      gainNodeRef.current &&
      rawStreamRef.current &&
      processedStreamRef.current
    ) {
      cleanupAudioProcessor({
        audioContext: audioContextRef.current,
        gainNode: gainNodeRef.current,
        rawStream: rawStreamRef.current,
        processedStream: processedStreamRef.current,
      });
    }

    // Reset refs
    rawStreamRef.current = null;
    processedStreamRef.current = null;
    audioContextRef.current = null;
    gainNodeRef.current = null;
  };

  // ==========================================================================
  // Microphone Control Methods
  // ==========================================================================

  const setupMicrophone = async () => {
    setMicrophoneState(MicrophoneState.SettingUp);
    setSetupError(null);

    // Cleanup any existing resources before setting up new ones
    cleanupResources();

    try {
      // Get raw MediaStream from getUserMedia with optional deviceId constraint
      const audioConstraints = deviceId
        ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } }
        : AUDIO_CONSTRAINTS;

      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // Create audio processing pipeline with gain control
      const processor = createAudioProcessor(rawStream, gain);

      // Store refs
      rawStreamRef.current = processor.rawStream;
      processedStreamRef.current = processor.processedStream;
      audioContextRef.current = processor.audioContext;
      gainNodeRef.current = processor.gainNode;

      // Create MediaRecorder from processed stream
      const mediaRecorder = new MediaRecorder(processor.processedStream);

      setMicrophoneState(MicrophoneState.Ready);
      setMicrophone(mediaRecorder);
      setStream(processor.processedStream);
      return { success: true as const, stream: processor.processedStream };
    } catch (err: unknown) {
      console.error("Failed to setup microphone:", err);
      cleanupResources();
      setMicrophoneState(MicrophoneState.Error);

      const errorInfo = getRecordingDeviceErrorInfo(err);
      setSetupError(errorInfo);

      // Stay on page: show notification instead of error screen
      toast.error(errorInfo.title, {
        description: errorInfo.message,
        duration: 8000,
      });
      return { success: false as const, error: errorInfo };
    }
  };

  const startMicrophone = () => {
    // Guard against null/undefined microphone
    if (!microphone) {
      console.warn("Cannot start microphone: microphone is not initialized");
      setMicrophoneState(MicrophoneState.Error);
      return;
    }

    // Guard: microphone must be in Ready state (inactive) or Paused state
    if (microphone.state !== "inactive" && microphone.state !== "paused") {
      console.warn(
        `Cannot start microphone: invalid state ${microphone.state}`
      );
      return;
    }

    try {
      setMicrophoneState(MicrophoneState.Opening);

      // Set up one-time event listeners for start/resume and error events
      const handleSuccess = () => {
        setMicrophoneState(MicrophoneState.Open);
        microphone.removeEventListener("start", handleStart);
        microphone.removeEventListener("resume", handleResume);
        microphone.removeEventListener("error", handleError);
      };

      const handleStart = () => handleSuccess();
      const handleResume = () => handleSuccess();

      const handleError = (event: Event) => {
        console.error("MediaRecorder error:", event);
        setMicrophoneState(MicrophoneState.Ready);
        microphone.removeEventListener("start", handleStart);
        microphone.removeEventListener("resume", handleResume);
        microphone.removeEventListener("error", handleError);
      };

      microphone.addEventListener("start", handleStart, { once: true });
      microphone.addEventListener("resume", handleResume, { once: true });
      microphone.addEventListener("error", handleError, { once: true });

      if (microphone.state === "paused") {
        microphone.resume();
      } else {
        microphone.start(MEDIA_RECORDER_TIMESLICE);
      }
    } catch (error) {
      console.error("Failed to start microphone:", error);
      setMicrophoneState(MicrophoneState.Ready);
    }
  };

  /**
   * Pauses the microphone recording (can be resumed later).
   * Note: This pauses the recording, not stops it completely.
   * For complete cleanup, the component unmount will handle it.
   */
  const stopMicrophone = () => {
    // Guard against null/undefined microphone
    if (!microphone) {
      console.warn("Cannot stop microphone: microphone is not initialized");
      return;
    }

    // Guard: only pause if microphone is actually recording
    // Check state first before transitioning to avoid leaving Pausing state
    if (microphone.state !== "recording") {
      // If already paused or inactive, set state accordingly
      if (microphone.state === "paused") {
        setMicrophoneState(MicrophoneState.Paused);
      } else if (microphone.state === "inactive") {
        setMicrophoneState(MicrophoneState.Ready);
      }
      return;
    }

    try {
      setMicrophoneState(MicrophoneState.Pausing);
      microphone.pause();
      setMicrophoneState(MicrophoneState.Paused);
    } catch (error) {
      console.error("Failed to stop microphone:", error);
      // Revert to previous valid state (was Open before Pausing)
      setMicrophoneState(MicrophoneState.Open);
    }

    // Note: We don't clean up streams/audio context here because they might be reused
    // Cleanup happens in useEffect cleanup on unmount
  };

  // ==========================================================================
  // Gain Control
  // ==========================================================================

  const setGain = (newGain: number) => {
    // Clamp gain to valid range
    const clampedGain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, newGain));
    setGainState(clampedGain);

    // Update gain node if it exists
    updateGain(gainNodeRef.current, clampedGain);
  };

  // ==========================================================================
  // Device Selection
  // ==========================================================================

  const setDeviceId = (newDeviceId: string | null) => {
    setDeviceIdState(newDeviceId);
    // Persist preference immediately
    setMicrophoneDevicePreferenceClient(newDeviceId);
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

  // Re-setup microphone when deviceId changes (if microphone is already set up)
  useEffect(() => {
    if (
      microphoneState === MicrophoneState.Ready ||
      microphoneState === MicrophoneState.Paused
    ) {
      void setupMicrophone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        stream,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
        setupError,
        gain,
        setGain,
        deviceId,
        setDeviceId,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext);

  if (context === undefined) {
    throw new Error(
      "useMicrophone must be used within a MicrophoneContextProvider"
    );
  }

  return context;
}

export { MicrophoneContextProvider, useMicrophone };

