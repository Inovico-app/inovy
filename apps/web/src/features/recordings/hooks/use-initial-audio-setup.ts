import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";
import { useEffect } from "react";

interface InitialAudioSetupOptions {
  audioSource?: AudioSourceType;
  combinedStream?: MediaStream | null;
  setupMicrophone: () => Promise<unknown>;
  stopMicrophone: () => void;
  stopSystemAudio: () => void;
}

/**
 * Handles initial microphone setup on mount and cleanup of all audio
 * sources on unmount. Only sets up the microphone automatically when
 * the audio source is "microphone" (or unset) and no combined stream
 * is provided.
 */
export function useInitialAudioSetup({
  audioSource,
  combinedStream,
  setupMicrophone,
  stopMicrophone,
  stopSystemAudio,
}: InitialAudioSetupOptions): void {
  useEffect(() => {
    if ((!audioSource || audioSource === "microphone") && !combinedStream) {
      void setupMicrophone();
    }

    return () => {
      stopMicrophone();
      stopSystemAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

