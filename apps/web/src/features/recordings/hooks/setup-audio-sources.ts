import type React from "react";
import {
  MicrophoneState,
  type useMicrophone,
} from "@/providers/microphone/MicrophoneProvider";
import {
  SystemAudioState,
  type useSystemAudio,
} from "@/providers/system-audio/SystemAudioProvider";
import {
  cleanupAudioMixer,
  mixMicrophoneAndSystemAudio,
} from "@/providers/microphone/audio-mixer";
import { waitForStreams } from "./wait-for-streams";
import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";

type MicrophoneHook = ReturnType<typeof useMicrophone>;
type SystemAudioHook = ReturnType<typeof useSystemAudio>;

interface SetupAudioSourcesParams {
  audioSource: AudioSourceType;
  microphoneHook: MicrophoneHook;
  systemAudioHook: SystemAudioHook;
  getMicrophoneStream: () => MediaStream | null;
  getSystemAudioStream: () => MediaStream | null;
  audioMixerRef: React.MutableRefObject<
    ReturnType<typeof mixMicrophoneAndSystemAudio> | null
  >;
  setCombinedStream: (stream: MediaStream | null) => void;
}

/**
 * Derives boolean flags for microphone and system audio states
 */
function getAudioSourceStates(
  microphoneState: MicrophoneState | null,
  systemAudioState: SystemAudioState | null
) {
  const micNotSetup =
    (microphoneState ?? MicrophoneState.NotSetup) ===
    MicrophoneState.NotSetup;
  const micError =
    (microphoneState ?? MicrophoneState.NotSetup) === MicrophoneState.Error;
  const sysNotSetup =
    (systemAudioState ?? SystemAudioState.NotSetup) ===
    SystemAudioState.NotSetup;
  const sysError =
    (systemAudioState ?? SystemAudioState.NotSetup) === SystemAudioState.Error;

  return { micNotSetup, micError, sysNotSetup, sysError };
}

/**
 * Sets up microphone-only audio source.
 * Throws with user-friendly message if setup fails (provider shows toast, does not throw).
 */
async function setupMicrophoneSource(
  microphoneHook: MicrophoneHook,
  states: ReturnType<typeof getAudioSourceStates>
): Promise<void> {
  if (states.micNotSetup || states.micError) {
    const result = await microphoneHook.setupMicrophone();
    if (!result.success) {
      throw new Error(result.error.message);
    }
  }
}

/**
 * Sets up system-audio-only source.
 * Throws with user-friendly message if setup fails (provider shows toast, does not throw).
 */
async function setupSystemAudioSource(
  systemAudioHook: SystemAudioHook,
  states: ReturnType<typeof getAudioSourceStates>
): Promise<void> {
  if (states.sysNotSetup || states.sysError) {
    const result = await systemAudioHook.setupSystemAudio();
    if (!result.success) {
      throw new Error(result.error.message);
    }
  }
}

/**
 * Sets up both microphone and system audio sources, then mixes them
 */
async function setupBothSources({
  microphoneHook,
  systemAudioHook,
  getMicrophoneStream,
  getSystemAudioStream,
  audioMixerRef,
  setCombinedStream,
  states,
}: SetupAudioSourcesParams & {
  states: ReturnType<typeof getAudioSourceStates>;
}): Promise<void> {
  if (states.micNotSetup || states.micError) {
    const micResult = await microphoneHook.setupMicrophone();
    if (!micResult.success) {
      throw new Error(micResult.error.message);
    }
  }

  if (states.sysNotSetup || states.sysError) {
    const sysResult = await systemAudioHook.setupSystemAudio();
    if (!sysResult.success) {
      throw new Error(sysResult.error.message);
    }
  }

  // Wait for streams to be ready
  await waitForStreams(getMicrophoneStream, getSystemAudioStream, {
    timeout: 5000,
    interval: 50,
  });

  // Verify streams are available after waiting
  const microphoneStream = getMicrophoneStream();
  const systemAudioStream = getSystemAudioStream();

  if (!microphoneStream || !systemAudioStream) {
    throw new Error(
      `Audio streams are not available after setup. Microphone: ${
        microphoneStream ? "available" : "missing"
      }, System audio: ${systemAudioStream ? "available" : "missing"}`
    );
  }

  // Mix the streams
  const mixer = mixMicrophoneAndSystemAudio(microphoneStream, systemAudioStream);
  audioMixerRef.current = mixer;
  setCombinedStream(mixer.mixedStream);
}

/**
 * Main function to setup audio sources based on selection
 */
export async function setupAudioSources(
  params: SetupAudioSourcesParams
): Promise<void> {
  const { audioSource, microphoneHook, systemAudioHook, audioMixerRef, setCombinedStream } =
    params;

  const states = getAudioSourceStates(
    microphoneHook.microphoneState,
    systemAudioHook.systemAudioState
  );

  // Cleanup existing mixer
  if (audioMixerRef.current) {
    cleanupAudioMixer(audioMixerRef.current);
    audioMixerRef.current = null;
  }
  setCombinedStream(null);

  // Setup based on audio source selection
  switch (audioSource) {
    case "microphone":
      await setupMicrophoneSource(microphoneHook, states);
      break;

    case "system":
      await setupSystemAudioSource(systemAudioHook, states);
      break;

    case "both":
      await setupBothSources({
        ...params,
        states,
      });
      break;

    default:
      throw new Error(`Unknown audio source: ${audioSource}`);
  }
}
