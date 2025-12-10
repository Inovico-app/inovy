"use client";

import { useLiveRecording } from "@/features/recordings/hooks/use-live-recording";
import { useLiveTranscription } from "@/features/recordings/hooks/use-live-transcription";
import { logger } from "@/lib/logger";
import { useEffect, useEffectEvent, useState } from "react";
import { ConsentManager } from "./consent-manager";
import { RecordingSection } from "./recording-section";
import { StopConfirmationDialog } from "./stop-confirmation-dialog";
import { TranscriptionDisplay } from "./transcription-display";

interface LiveRecorderProps {
  onRecordingComplete: (
    audioBlob: Blob,
    transcription: string,
    consentGranted: boolean,
    consentGrantedAt: Date
  ) => Promise<void>;
  liveTranscriptionEnabled: boolean;
  onTranscriptionToggle: (enabled: boolean) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export function LiveRecorder({
  onRecordingComplete,
  liveTranscriptionEnabled: externalLiveTranscriptionEnabled,
  onTranscriptionToggle: _onTranscriptionToggle,
  onRecordingStateChange,
}: LiveRecorderProps) {
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentGrantedAt, setConsentGrantedAt] = useState<Date | null>(null);

  // Custom hooks
  const recording = useLiveRecording();
  const transcription = useLiveTranscription({
    microphone: recording.microphone,
    isRecording: recording.isRecording,
    isPaused: recording.isPaused,
    audioChunksRef: recording.audioChunksRef,
  });

  // Sync external transcription state with internal hook state
  useEffect(() => {
    if (
      transcription.liveTranscriptionEnabled !==
      externalLiveTranscriptionEnabled
    ) {
      transcription.handleToggleTranscription(externalLiveTranscriptionEnabled);
    }
  }, [externalLiveTranscriptionEnabled, transcription]);

  // Notify parent of recording state changes
  useEffect(() => {
    onRecordingStateChange?.(recording.isRecording);
  }, [recording.isRecording, onRecordingStateChange]);

  // Handle start recording
  const handleStart = useEffectEvent(async () => {
    // Show consent banner if consent not yet granted
    if (!consentGranted) {
      setShowConsentBanner(true);
      return;
    }

    try {
      if (externalLiveTranscriptionEnabled) {
        // Start recording with transcription
        await recording.handleStart(true, async () => {
          // Connect to Deepgram
          await transcription.connectToDeepgram({
            model: "nova-3",
            language: "nl",
            smart_format: true,
            diarize: true,
            punctuate: true,
            utterances: true,
            interim_results: true,
          });
        });
      } else {
        // Start recording without transcription
        await recording.handleStart(false);
      }
    } catch (error) {
      logger.warn(
        "Failed to start recording with transcription:",
        error instanceof Error ? { error } : { error: String(error) }
      );
      recording.setRecorderError(
        "Failed to start recording with transcription"
      );
    }
  });

  // Handle consent granted
  const handleConsentGranted = useEffectEvent(() => {
    const now = new Date();
    setConsentGranted(true);
    setConsentGrantedAt(now);
    setShowConsentBanner(false);
    // Start recording after consent is granted
    void handleStart();
  });

  // Handle consent denied
  const handleConsentDenied = useEffectEvent(() => {
    setShowConsentBanner(false);
  });

  // Handle stop click (with confirmation for short recordings)
  const handleStopClick = useEffectEvent(() => {
    if (recording.duration < 3) {
      setShowStopConfirm(true);
    } else {
      void handleFinalStop();
    }
  });

  // Handle final stop
  const handleFinalStop = useEffectEvent(async () => {
    try {
      setShowStopConfirm(false);

      // Stop recording and get audio blob
      const audioBlob = await recording.handleStop();

      // Disconnect from Deepgram
      transcription.disconnectFromDeepgram();

      // Combine transcripts into single string
      const fullTranscript = transcription.transcripts
        .map((t) => t.text)
        .join(" ");

      // Call completion handler with consent information
      await onRecordingComplete(
        audioBlob,
        fullTranscript,
        consentGranted,
        consentGrantedAt ?? new Date()
      );

      // Clear transcripts
      transcription.clearTranscripts();
    } catch (error) {
      console.error("Error in handleFinalStop:", error);
      recording.setRecorderError(
        "Kon transcriptie niet starten. Probeer het opnieuw."
      );
    }
  });

  const formattedDuration = `${Math.floor(recording.duration / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(recording.duration % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <>
      <div
        className={
          externalLiveTranscriptionEnabled
            ? "flex flex-col xl:flex-row gap-6"
            : ""
        }
      >
        {/* Main Recording Section - Always same height */}
        <div
          className={
            externalLiveTranscriptionEnabled ? "flex-1 min-w-0" : "w-full"
          }
          style={{
            height: "calc(100vh - 12rem)",
            minHeight: "600px",
            maxHeight: "800px",
          }}
        >
          <RecordingSection
            isRecording={recording.isRecording}
            isPaused={recording.isPaused}
            duration={recording.duration}
            isSaving={recording.isSaving}
            permissionDenied={recording.permissionDenied}
            recorderError={recording.recorderError}
            transcriptionError={transcription.transcriptionError}
            stream={recording.stream}
            liveTranscriptionEnabled={externalLiveTranscriptionEnabled}
            isTranscribing={transcription.isTranscribing}
            consentGranted={consentGranted}
            wakeLockActive={recording.wakeLockActive}
            formattedDuration={formattedDuration}
            onStart={handleStart}
            onPause={recording.handlePause}
            onResume={recording.handleResume}
            onStop={handleStopClick}
          />
        </div>

        {/* Live Transcription Section - Same height as recording */}
        {externalLiveTranscriptionEnabled && (
          <div
            className="flex-1 min-w-0"
            style={{
              height: "calc(100vh - 12rem)",
              minHeight: "600px",
              maxHeight: "800px",
            }}
          >
            <TranscriptionDisplay
              transcripts={transcription.transcripts}
              isRecording={recording.isRecording}
            />
          </div>
        )}
      </div>

      <ConsentManager
        showConsentBanner={showConsentBanner}
        onConsentGranted={handleConsentGranted}
        onConsentDenied={handleConsentDenied}
      />

      <StopConfirmationDialog
        open={showStopConfirm}
        onOpenChange={setShowStopConfirm}
        onConfirm={handleFinalStop}
      />
    </>
  );
}
