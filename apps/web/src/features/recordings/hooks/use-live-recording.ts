import { useWakeLock } from "@/hooks/use-wake-lock";
import { useMicrophone } from "@/providers/MicrophoneProvider";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRecordingDuration } from "./use-recording-duration";

export function useLiveRecording() {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Hooks
  const {
    microphone,
    stream,
    setupMicrophone,
    startMicrophone,
    stopMicrophone,
  } = useMicrophone();
  const { duration, startTimer, stopTimer, resetTimer } =
    useRecordingDuration();
  const wakeLock = useWakeLock(); // Prevent screen from locking during recording

  // Refs
  const audioChunksRef = useRef<Blob[]>([]);

  // Effect Event for microphone setup (non-reactive)
  const onMicrophoneSetup = useEffectEvent(async () => {
    try {
      await setupMicrophone();
    } catch (error) {
      console.error("Error setting up microphone:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermissionDenied(true);
      }
      setRecorderError("Kon microfoon niet initialiseren");
    }
  });

  // Setup microphone on mount
  useEffect(() => {
    void onMicrophoneSetup();

    return () => {
      stopMicrophone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler: Start recording
  const handleStart = useEffectEvent(
    async (
      enableTranscription: boolean,
      onTranscriptionReady?: () => void | Promise<void>
    ) => {
      try {
        setPermissionDenied(false);
        setRecorderError(null);
        audioChunksRef.current = [];

        setIsRecording(true);
        setIsPaused(false);
        resetTimer();
        startTimer();

        // Request wake lock to prevent screen from locking during recording
        await wakeLock.request();

        // If transcription is disabled, start microphone immediately
        // Otherwise, wait for transcription connection (caller handles this)
        if (!enableTranscription) {
          startMicrophone();
        } else if (onTranscriptionReady) {
          await onTranscriptionReady();
        }
      } catch (error) {
        console.error("Error starting recording:", error);
        if (error instanceof Error && error.name === "NotAllowedError") {
          setPermissionDenied(true);
        }
        setRecorderError("Kon opname niet starten");
        stopTimer();
        setIsRecording(false);
        // Release wake lock if recording failed
        await wakeLock.release();
      }
    }
  );

  // Handler: Pause recording
  const handlePause = useEffectEvent(() => {
    if (microphone && microphone.state === "recording") {
      microphone.pause();
      setIsPaused(true);
      stopTimer();
    }
  });

  // Handler: Resume recording
  const handleResume = useEffectEvent(() => {
    if (microphone && microphone.state === "paused") {
      microphone.resume();
      setIsPaused(false);
      startTimer();
    }
  });

  // Handler: Stop recording and return audio blob
  const handleStop = useEffectEvent(async (): Promise<Blob> => {
    try {
      setIsSaving(true);
      stopTimer();
      stopMicrophone();

      // Release wake lock when recording stops
      await wakeLock.release();

      // Combine audio chunks into single blob
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      if (audioBlob.size === 0) {
        throw new Error("Geen audio data opgenomen");
      }

      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      resetTimer();
      audioChunksRef.current = [];

      return audioBlob;
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecorderError(
        error instanceof Error ? error.message : "Fout bij stoppen van opname"
      );
      throw error;
    } finally {
      setIsSaving(false);
    }
  });

  // Getter for audio chunks (allows external code to add chunks)
  const getAudioChunksRef = () => audioChunksRef;

  return {
    // State
    isRecording,
    isPaused,
    duration,
    isSaving,
    recorderError,
    permissionDenied,
    setRecorderError,

    // Microphone
    microphone,
    stream,
    startMicrophone,

    // Handlers
    handleStart,
    handlePause,
    handleResume,
    handleStop,

    // Refs
    audioChunksRef: getAudioChunksRef(),

    // Wake Lock
    wakeLockSupported: wakeLock.isSupported,
    wakeLockActive: wakeLock.isActive,
  };
}

