import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";
import type { RecordingDeviceErrorInfo } from "@/features/recordings/lib/recording-device-errors";
import { useEffect, useState } from "react";

interface SetupErrorSources {
  microphoneSetupError: RecordingDeviceErrorInfo | null;
  systemAudioSetupError: RecordingDeviceErrorInfo | null;
  audioSource: AudioSourceType;
}

interface RecordingSetupErrors {
  recorderError: string | null;
  permissionDenied: boolean;
  setRecorderError: (error: string | null) => void;
  setPermissionDenied: (denied: boolean) => void;
  clearErrors: () => void;
}

/**
 * Syncs provider-level setup errors into local recording error state,
 * choosing the relevant error based on the active audio source.
 */
export function useRecordingSetupErrors({
  microphoneSetupError,
  systemAudioSetupError,
  audioSource,
}: SetupErrorSources): RecordingSetupErrors {
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let activeError: RecordingDeviceErrorInfo | null = null;

    if (audioSource === "system") {
      activeError = systemAudioSetupError;
    } else if (audioSource === "microphone") {
      activeError = microphoneSetupError;
    } else if (audioSource === "both") {
      activeError = systemAudioSetupError ?? microphoneSetupError;
    }

    if (activeError) {
      setPermissionDenied(activeError.type === "permission_denied");
      setRecorderError(activeError.message);
    }
  }, [microphoneSetupError, systemAudioSetupError, audioSource]);

  const clearErrors = () => {
    setPermissionDenied(false);
    setRecorderError(null);
  };

  return {
    recorderError,
    permissionDenied,
    setRecorderError,
    setPermissionDenied,
    clearErrors,
  };
}

