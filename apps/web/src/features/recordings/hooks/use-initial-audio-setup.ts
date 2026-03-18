import { useEffect } from "react";

interface InitialAudioSetupOptions {
  stopMicrophone: () => void;
  stopSystemAudio: () => void;
}

/**
 * Handles cleanup of all audio sources on unmount.
 * Microphone/system audio setup is deferred to when the user starts recording
 * to avoid triggering the browser's recording indicator on page load.
 */
export function useInitialAudioSetup({
  stopMicrophone,
  stopSystemAudio,
}: InitialAudioSetupOptions): void {
  useEffect(() => {
    return () => {
      stopMicrophone();
      stopSystemAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
