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

  // Convert enum states to numbers for easier comparison
  const micState = microphoneState ?? MicrophoneState.NotSetup;
  const sysState = systemAudioState ?? SystemAudioState.NotSetup;

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
      // Cleanup existing mixer
      if (audioMixerRef.current) {
        cleanupAudioMixer(audioMixerRef.current);
        audioMixerRef.current = null;
      }
      setCombinedStream(null);

      // Setup based on audio source selection
      if (audioSource === "microphone") {
        // Only microphone - use existing microphone setup
        if (microphoneState === null || microphoneState === -1) {
          await setupMicrophone();
        }
        // No mixing needed, microphoneStream will be used directly
      } else if (audioSource === "system") {
        // Only system audio
        if (
          systemAudioState === null ||
          systemAudioState === -1 ||
          systemAudioState === 4 // Error state
        ) {
          await setupSystemAudio();
        }
        // No mixing needed, systemAudioStream will be used directly
      } else if (audioSource === "both") {
        // Both sources - need to setup both and mix them
        // Setup microphone if not already set up
        if (microphoneState === null || microphoneState === -1) {
          await setupMicrophone();
        }

        // Setup system audio if not already set up
        if (
          systemAudioState === null ||
          systemAudioState === -1 ||
          systemAudioState === 4 // Error state
        ) {
          await setupSystemAudio();
        }

        // Wait a bit for streams to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Mix the streams
        if (microphoneStream && systemAudioStream) {
          const mixer = mixMicrophoneAndSystemAudio(
            microphoneStream,
            systemAudioStream
          );
          audioMixerRef.current = mixer;
          setCombinedStream(mixer.mixedStream);
        } else {
          throw new Error(
            "Both microphone and system audio streams are required for mixing"
          );
        }
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
