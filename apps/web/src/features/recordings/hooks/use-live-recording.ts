import { useWakeLock } from "@/hooks/use-wake-lock";
import type { AudioSourceType } from "@/features/recordings/lib/audio-source-preferences";
import { logger } from "@/lib/logger";
import { useMicrophone } from "@/providers/microphone/MicrophoneProvider";
import { useSystemAudio } from "@/providers/system-audio/SystemAudioProvider";
import { useEffect, useEffectEvent, useRef, useState } from "react";
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
    setupError: microphoneSetupError,
    startMicrophone,
    stopMicrophone,
  } = useMicrophone();
  const {
    systemAudio,
    systemAudioStream,
    setupSystemAudio,
    setupError: systemAudioSetupError,
    startSystemAudio,
    stopSystemAudio,
  } = useSystemAudio();
  const { duration, startTimer, stopTimer, resetTimer } =
    useRecordingDuration();
  const wakeLock = useWakeLock(); // Prevent screen from locking during recording

  // Refs
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Sync permission/error state from provider (setup no longer throws)
  useEffect(() => {
    const err = microphoneSetupError ?? systemAudioSetupError;
    if (err) {
      setPermissionDenied(err.type === "permission_denied");
      setRecorderError(err.message);
    }
  }, [microphoneSetupError, systemAudioSetupError]);

  // Only setup microphone on mount (default behavior)
  // Don't setup system audio automatically - only when user explicitly selects it and starts recording
  useEffect(() => {
    if (
      (!options?.audioSource || options.audioSource === "microphone") &&
      !options?.combinedStream
    ) {
      void setupMicrophone();
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
        // Capture streams from setup results (state may not have updated yet)
        let micStreamFromSetup: MediaStream | null = null;
        let sysStreamFromSetup: MediaStream | null = null;

        if (currentAudioSource === "system" || currentAudioSource === "both") {
          if (!systemAudioStream) {
            const result = await setupSystemAudio();
            if (!result.success && result.error) {
              setPermissionDenied(result.error.type === "permission_denied");
              setRecorderError(result.error.message);
              return;
            }
            if (result.success) sysStreamFromSetup = result.stream;
          }
        }

        if (currentAudioSource === "microphone" || currentAudioSource === "both") {
          if (!microphoneStream) {
            const result = await setupMicrophone();
            if (!result.success && result.error) {
              setPermissionDenied(result.error.type === "permission_denied");
              setRecorderError(result.error.message);
              return;
            }
            if (result.success) micStreamFromSetup = result.stream;
          }
        }

        // Re-determine active stream (use freshly-set-up streams when state hasn't propagated yet)
        const finalActiveStream =
          options?.combinedStream ||
          (currentAudioSource === "system"
            ? sysStreamFromSetup ?? systemAudioStream
            : micStreamFromSetup ?? microphoneStream);
        const finalActiveRecorder =
          currentAudioSource === "system" ? systemAudio : microphone;

        if (!finalActiveStream) {
          setRecorderError(
            "Geen audio stream beschikbaar. Controleer je microfoon of systeemaudio-instellingen."
          );
          return;
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

          recorder.onerror = (event) => {
            logger.error("MediaRecorder error", {
              component: "use-live-recording",
              error: event instanceof ErrorEvent ? event.error : new Error(String(event)),
            });

            // Stop recording and transition to error state
            try {
              if (recorder.state !== "inactive") {
                recorder.stop();
              }
            } catch (stopError) {
              logger.error("Error stopping MediaRecorder after error", {
                component: "use-live-recording",
                error: stopError instanceof Error ? stopError : new Error(String(stopError)),
              });
            }

            // Clear the recorder reference
            mediaRecorderRef.current = null;

            // Update state
            setIsRecording(false);
            setIsPaused(false);
            stopTimer();
            setRecorderError(
              event instanceof ErrorEvent && event.error
                ? event.error.message
                : "MediaRecorder error occurred"
            );

            // Release wake lock
            wakeLock.release().catch((releaseError) => {
              logger.error("Error releasing wake lock after MediaRecorder error", {
                component: "use-live-recording",
                error: releaseError instanceof Error ? releaseError : new Error(String(releaseError)),
              });
            });
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
      if (options?.combinedStream) {
        // Capture recorder reference atomically to avoid race conditions
        const recorder = mediaRecorderRef.current;
        
        if (recorder && recorder.state === "recording") {
          // Wait for final data with atomic handler setup
          await new Promise<void>((resolve) => {
            // Set onstop handler before calling stop to ensure we catch the event
            recorder.onstop = () => {
              // Clear the handler to avoid stray handlers
              recorder.onstop = null;
              resolve();
            };
            // Only call stop if still recording (atomic check)
            if (recorder.state === "recording") {
              recorder.stop();
            } else {
              // If state changed between checks, clear handler and resolve immediately
              recorder.onstop = null;
              resolve();
            }
          });
        }
        // If recorder is null or already inactive, no need to wait
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

