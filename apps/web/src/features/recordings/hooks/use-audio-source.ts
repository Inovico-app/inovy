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
  cleanupAudioMixer,
  type mixMicrophoneAndSystemAudio,
} from "@/providers/microphone/audio-mixer";
import { useMicrophone } from "@/providers/microphone/MicrophoneProvider";
import { useSystemAudio } from "@/providers/system-audio/SystemAudioProvider";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { setupAudioSources } from "./setup-audio-sources";
import { useStreamRefs } from "./use-stream-refs";

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
  const microphoneHook = useMicrophone();
  const systemAudioHook = useSystemAudio();

  // Refs
  const audioMixerRef = useRef<ReturnType<
    typeof mixMicrophoneAndSystemAudio
  > | null>(null);

  // Track latest stream values in refs to avoid stale closures
  const { microphoneStreamRef, systemAudioStreamRef } = useStreamRefs(
    microphoneHook.stream,
    systemAudioHook.systemAudioStream
  );

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
  const handleSetupAudioSources = useEffectEvent(async () => {
    setIsSettingUp(true);
    setSetupError(null);

    try {
      await setupAudioSources({
        audioSource,
        microphoneHook,
        systemAudioHook,
        getMicrophoneStream: () => microphoneStreamRef.current,
        getSystemAudioStream: () => systemAudioStreamRef.current,
        audioMixerRef,
        setCombinedStream,
      });
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
      return microphoneHook.stream;
    }
    if (audioSource === "system") {
      return systemAudioHook.systemAudioStream;
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
    microphoneStream: microphoneHook.stream,
    systemAudioStream: systemAudioHook.systemAudioStream,
    setupAudioSources: handleSetupAudioSources,
    isSettingUp,
    setupError,
  };
}

