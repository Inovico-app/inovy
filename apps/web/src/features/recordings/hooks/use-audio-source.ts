"use client";

import {
  getAudioSourcePreferenceClient,
  setAudioSourcePreferenceClient,
  type AudioSourceType,
} from "@/features/recordings/lib/audio-source-preferences";
import {
  detectSystemAudioSupport,
  type SystemAudioCompatibility,
} from "@/features/recordings/lib/system-audio-detection";
import {
  MicrophoneState,
  useMicrophone,
} from "@/providers/microphone/MicrophoneProvider";
import {
  SystemAudioState,
  useSystemAudio,
} from "@/providers/system-audio/SystemAudioProvider";
import {
  cleanupAudioMixer,
  mixMicrophoneAndSystemAudio,
} from "@/providers/microphone/audio-mixer";
import { useEffect, useEffectEvent, useRef, useState } from "react";

/**
 * Wait for MediaStream audio tracks to become ready (readyState === 'live')
 * Uses getter functions to ensure we check the latest stream values during polling
 * @param getMicrophoneStream - Function that returns microphone MediaStream (optional)
 * @param getSystemAudioStream - Function that returns system audio MediaStream (optional)
 * @param timeout - Maximum time to wait in milliseconds (default: 5000ms)
 * @param interval - Polling interval in milliseconds (default: 50ms)
 * @throws Error if timeout is reached before streams are ready
 */
async function waitForStreams(
  getMicrophoneStream: () => MediaStream | null,
  getSystemAudioStream: () => MediaStream | null,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();

  const checkStreamsReady = (): boolean => {
    // Get latest stream values using getters
    const microphoneStream = getMicrophoneStream();
    const systemAudioStream = getSystemAudioStream();

    // Check microphone stream if it should be available
    // Note: In "both" mode, both streams are required
    if (microphoneStream) {
      const micAudioTracks = microphoneStream.getAudioTracks();
      if (micAudioTracks.length === 0) {
        return false; // No audio tracks yet
      }
      // All microphone audio tracks must be 'live'
      if (!micAudioTracks.every((track) => track.readyState === "live")) {
        return false;
      }
    } else {
      // If microphone stream is expected but not available, not ready
      // (This handles the case where stream hasn't been set yet after setup)
      return false;
    }

    // Check system audio stream if it should be available
    // Note: In "both" mode, both streams are required
    if (systemAudioStream) {
      const sysAudioTracks = systemAudioStream.getAudioTracks();
      if (sysAudioTracks.length === 0) {
        return false; // No audio tracks yet
      }
      // All system audio tracks must be 'live'
      if (!sysAudioTracks.every((track) => track.readyState === "live")) {
        return false;
      }
    } else {
      // If system audio stream is expected but not available, not ready
      // (This handles the case where stream hasn't been set yet after setup)
      return false;
    }

    return true;
  };

  // If streams are already ready, return immediately
  if (checkStreamsReady()) {
    return;
  }

  // Poll until streams are ready or timeout
  return new Promise<void>((resolve, reject) => {
    const pollInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (checkStreamsReady()) {
        clearInterval(pollInterval);
        resolve();
        return;
      }

      if (elapsed >= timeout) {
        clearInterval(pollInterval);
        // Get latest stream values for error message
        const microphoneStream = getMicrophoneStream();
        const systemAudioStream = getSystemAudioStream();
        const missingStreams: string[] = [];
        if (microphoneStream) {
          const micTracks = microphoneStream.getAudioTracks();
          if (
            micTracks.length === 0 ||
            !micTracks.every((track) => track.readyState === "live")
          ) {
            missingStreams.push("microphone");
          }
        }
        if (systemAudioStream) {
          const sysTracks = systemAudioStream.getAudioTracks();
          if (
            sysTracks.length === 0 ||
            !sysTracks.every((track) => track.readyState === "live")
          ) {
            missingStreams.push("system audio");
          }
        }
        reject(
          new Error(
            `Timeout waiting for audio streams to become ready: ${missingStreams.join(", ")}`
          )
        );
      }
    }, interval);
  });
}

export interface UseAudioSourceReturn {
  // Audio source selection
  audioSource: AudioSourceType;
  setAudioSource: (source: AudioSourceType) => void;
  
  // Compatibility
  compatibility: SystemAudioCompatibility;
  isSystemAudioSupported: boolean;
  
  // Combined stream (when both sources are enabled)
  combinedStream: MediaStream | null;
  
  // Individual streams
  microphoneStream: MediaStream | null;
  systemAudioStream: MediaStream | null;
  
  // Setup methods
  setupAudioSources: () => Promise<void>;
  
  // State
  isSettingUp: boolean;
  setupError: string | null;
}

export function useAudioSource(): UseAudioSourceReturn {
  // State
  const [audioSource, setAudioSourceState] = useState<AudioSourceType>(() =>
    getAudioSourcePreferenceClient()
  );
  const [combinedStream, setCombinedStream] = useState<MediaStream | null>(
    null
  );
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Compatibility check
  const compatibility = detectSystemAudioSupport();
  const isSystemAudioSupported = compatibility.isAudioSupported;

  // Hooks
  const {
    stream: microphoneStream,
    setupMicrophone,
    microphoneState,
  } = useMicrophone();
  const {
    systemAudioStream,
    setupSystemAudio,
    systemAudioState,
  } = useSystemAudio();

  // Refs
  const audioMixerRef = useRef<ReturnType<typeof mixMicrophoneAndSystemAudio> | null>(null);

  // Update audio source preference when changed
  const setAudioSource = useEffectEvent((source: AudioSourceType) => {
    // Validate source is valid for current browser
    if (source === "system" || source === "both") {
      if (!isSystemAudioSupported) {
        setSetupError(
          "System audio is not supported in this browser. Please use Chrome, Edge, or Opera."
        );
        return;
      }
    }

    // Cleanup existing mixer if switching away from "both"
    if (audioSource === "both" && source !== "both") {
      if (audioMixerRef.current) {
        cleanupAudioMixer(audioMixerRef.current);
        audioMixerRef.current = null;
      }
      setCombinedStream(null);
    }

    setAudioSourceState(source);
    setAudioSourcePreferenceClient(source);
    setSetupError(null);
  });

  // Setup audio sources based on selection
  const setupAudioSources = useEffectEvent(async () => {
    setIsSettingUp(true);
    setSetupError(null);

    try {
      // Derive explicit boolean flags using enum values instead of magic numbers
      // These are computed here to ensure they use the latest state values
      const micNotSetup = (microphoneState ?? MicrophoneState.NotSetup) === MicrophoneState.NotSetup;
      const micError = (microphoneState ?? MicrophoneState.NotSetup) === MicrophoneState.Error;
      const sysNotSetup = (systemAudioState ?? SystemAudioState.NotSetup) === SystemAudioState.NotSetup;
      const sysError = (systemAudioState ?? SystemAudioState.NotSetup) === SystemAudioState.Error;

      // Cleanup existing mixer
      if (audioMixerRef.current) {
        cleanupAudioMixer(audioMixerRef.current);
        audioMixerRef.current = null;
      }
      setCombinedStream(null);

      // Setup based on audio source selection
      if (audioSource === "microphone") {
        // Only microphone - use existing microphone setup
        if (micNotSetup) {
          await setupMicrophone();
        }
        // No mixing needed, microphoneStream will be used directly
      } else if (audioSource === "system") {
        // Only system audio
        if (sysNotSetup || sysError) {
          await setupSystemAudio();
        }
        // No mixing needed, systemAudioStream will be used directly
      } else if (audioSource === "both") {
        // Both sources - need to setup both and mix them
        // Setup microphone if not already set up
        if (micNotSetup) {
          await setupMicrophone();
        }

        // Setup system audio if not already set up or in error state
        if (sysNotSetup || sysError) {
          await setupSystemAudio();
        }

        // Wait for streams to be ready with deterministic readiness check
        // This ensures audio tracks are actually 'live' before attempting to mix
        // Use getter functions to check latest stream values during polling
        // The getters allow us to check the latest hook values during polling
        // (Note: Hook values update after React re-renders, so polling ensures we catch updates)
        await waitForStreams(
          () => microphoneStream,
          () => systemAudioStream,
          5000,
          50
        );

        // After waitForStreams confirms readiness, verify streams are still available
        // Streams should be available now after waitForStreams confirms they're ready
        if (!microphoneStream || !systemAudioStream) {
          throw new Error(
            "Audio streams are not available after setup. Microphone: " +
              (microphoneStream ? "available" : "missing") +
              ", System audio: " +
              (systemAudioStream ? "available" : "missing")
          );
        }

        // Mix the streams
        const mixer = mixMicrophoneAndSystemAudio(
          microphoneStream,
          systemAudioStream
        );
        audioMixerRef.current = mixer;
        setCombinedStream(mixer.mixedStream);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to setup audio sources";
      setSetupError(errorMessage);
      console.error("Error setting up audio sources:", error);
    } finally {
      setIsSettingUp(false);
    }
  });

  // Don't auto-setup audio sources - only setup when explicitly requested (e.g., when starting recording)
  // This prevents permission prompts from appearing when user hasn't explicitly requested system audio
  // The setup will be called explicitly from useLiveRecording when recording starts

  // Cleanup mixer on unmount
  useEffect(() => {
    return () => {
      if (audioMixerRef.current) {
        cleanupAudioMixer(audioMixerRef.current);
        audioMixerRef.current = null;
      }
    };
  }, []);

  // Get the active stream based on audio source
  const getActiveStream = (): MediaStream | null => {
    if (audioSource === "microphone") {
      return microphoneStream;
    }
    if (audioSource === "system") {
      return systemAudioStream;
    }
    if (audioSource === "both") {
      return combinedStream;
    }
    return null;
  };

  return {
    audioSource,
    setAudioSource,
    compatibility,
    isSystemAudioSupported,
    combinedStream: getActiveStream(),
    microphoneStream,
    systemAudioStream,
    setupAudioSources,
    isSettingUp,
    setupError,
  };
}
