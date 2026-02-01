import { useWakeLock } from "@/hooks/use-wake-lock";
import { logger } from "@/lib/logger";
import { useMicrophone } from "@/providers/microphone/MicrophoneProvider";
import { useSystemAudio } from "@/providers/system-audio/SystemAudioProvider";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";
import { useRecordingDuration } from "./use-recording-duration";

export interface UseLiveRecordingOptions {
  audioSource?: AudioSourceType;
  combinedStream?: MediaStream | null;
}

export function useLiveRecording(options?: UseLiveRecordingOptions) {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Hooks
  const {
    microphone,
    stream: microphoneStream,
    setupMicrophone,
    startMicrophone,
    stopMicrophone,
  } = useMicrophone();
  const {
    systemAudio,
    systemAudioStream,
    startSystemAudio,
    stopSystemAudio,
    setupSystemAudio,
  } = useSystemAudio();
  const { duration, startTimer, stopTimer, resetTimer } =
    useRecordingDuration();
  const wakeLock = useWakeLock(); // Prevent screen from locking during recording

  // Refs
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Only setup microphone on mount (default behavior)
  // Don't setup system audio automatically - only when user explicitly selects it and starts recording
  useEffect(() => {
    // Only setup microphone if it's the selected audio source and not using combined stream
    if (
      (!options?.audioSource || options.audioSource === "microphone") &&
      !options?.combinedStream
    ) {
      void setupMicrophone().catch((error) => {
        logger.error("Error setting up microphone", {
          component: "use-live-recording",
          error: error instanceof Error ? error : new Error(String(error)),
        });
        if (error instanceof Error && error.name === "NotAllowedError") {
          setPermissionDenied(true);
        }
        setRecorderError("Kon microfoon niet initialiseren");
      });
    }

    return () => {
      stopMicrophone();
      stopSystemAudio();
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

        const currentAudioSource = options?.audioSource || "microphone";

        // Setup audio sources if needed (this is when we request permissions)
        // Only setup system audio if user has explicitly selected it
        if (currentAudioSource === "system" || currentAudioSource === "both") {
          if (!systemAudioStream) {
            try {
              await setupSystemAudio();
            } catch (error) {
              logger.error("Error setting up system audio", {
                component: "use-live-recording",
                error:
                  error instanceof Error ? error : new Error(String(error)),
              });
              if (error instanceof Error && error.name === "NotAllowedError") {
                setPermissionDenied(true);
              }
              setRecorderError("Kon systeem audio niet initialiseren");
              throw error;
            }
          }
        }

        if (currentAudioSource === "microphone" || currentAudioSource === "both") {
          if (!microphoneStream) {
            try {
              await setupMicrophone();
            } catch (error) {
              logger.error("Error setting up microphone", {
                component: "use-live-recording",
                error:
                  error instanceof Error ? error : new Error(String(error)),
              });
              if (error instanceof Error && error.name === "NotAllowedError") {
                setPermissionDenied(true);
              }
              setRecorderError("Kon microfoon niet initialiseren");
              throw error;
            }
          }
        }

        // Re-determine active stream after setup
        const finalActiveStream =
          options?.combinedStream ||
          (currentAudioSource === "system" ? systemAudioStream : microphoneStream);
        const finalActiveRecorder =
          currentAudioSource === "system" ? systemAudio : microphone;

        // Ensure we have the active stream
        if (!finalActiveStream) {
          throw new Error("No audio stream available");
        }

        // Create MediaRecorder from the active stream (if using combined stream)
        // Otherwise, use the existing recorder from the provider
        if (options?.combinedStream && !mediaRecorderRef.current) {
          const recorder = new MediaRecorder(finalActiveStream, {
            mimeType: "audio/webm;codecs=opus",
          });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
        }

        setIsRecording(true);
        setIsPaused(false);
        resetTimer();
        startTimer();

        // Request wake lock to prevent screen from locking during recording
        await wakeLock.request();

        // Start the appropriate recorder based on audio source
        if (options?.combinedStream && mediaRecorderRef.current) {
          // Using combined stream - start our own MediaRecorder
          mediaRecorderRef.current.start(250);
        } else {
          // Using provider's recorder
          if (currentAudioSource === "system") {
            if (finalActiveRecorder) {
              startSystemAudio();
            }
          } else {
            // Microphone or both (both uses microphone's recorder)
            if (!enableTranscription) {
              startMicrophone();
            } else if (onTranscriptionReady) {
              await onTranscriptionReady();
            }
          }
        }
      } catch (error) {
        logger.error("Error starting recording", {
          component: "use-live-recording",
          error: error instanceof Error ? error : new Error(String(error)),
        });
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
    const audioSource = options?.audioSource || "microphone";
    const recorder = options?.combinedStream
      ? mediaRecorderRef.current
      : audioSource === "system"
        ? systemAudio
        : microphone;

    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      stopTimer();
    }
  });

  // Handler: Resume recording
  const handleResume = useEffectEvent(() => {
    const audioSource = options?.audioSource || "microphone";
    const recorder = options?.combinedStream
      ? mediaRecorderRef.current
      : audioSource === "system"
        ? systemAudio
        : microphone;

    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
      startTimer();
    }
  });

  // Handler: Stop recording and return audio blob
  const handleStop = useEffectEvent(async (): Promise<Blob> => {
    try {
      setIsSaving(true);
      stopTimer();

      // Stop the appropriate recorder
      if (options?.combinedStream && mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        // Wait for final data
        await new Promise<void>((resolve) => {
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => resolve();
            if (mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
            } else {
              resolve();
            }
          } else {
            resolve();
          }
        });
      } else {
        // Stop provider recorders
        const currentAudioSource = options?.audioSource || "microphone";
        if (currentAudioSource === "system") {
          stopSystemAudio();
        } else {
          stopMicrophone();
        }
      }

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
      mediaRecorderRef.current = null;

      return audioBlob;
    } catch (error) {
      logger.error("Error stopping recording", {
        component: "use-live-recording",
        error: error instanceof Error ? error : new Error(String(error)),
      });
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

  // Determine current active stream and recorder
  const currentAudioSource = options?.audioSource || "microphone";
  const currentActiveStream =
    options?.combinedStream ||
    (currentAudioSource === "system" ? systemAudioStream : microphoneStream);
  const currentActiveRecorder =
    currentAudioSource === "system" ? systemAudio : microphone;

  return {
    // State
    isRecording,
    isPaused,
    duration,
    isSaving,
    recorderError,
    permissionDenied,
    setRecorderError,

    // Audio sources
    microphone: currentActiveRecorder,
    stream: currentActiveStream,
    startMicrophone:
      currentAudioSource === "system" ? startSystemAudio : startMicrophone,

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

