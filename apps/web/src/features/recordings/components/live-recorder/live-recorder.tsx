"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { ConsentBanner } from "@/features/recordings/components/consent-banner";
import { ConsentStatus } from "@/features/recordings/components/consent-status";
import { useLiveRecording } from "@/features/recordings/hooks/use-live-recording";
import { useLiveTranscription } from "@/features/recordings/hooks/use-live-transcription";
import { logger } from "@/lib/logger";
import { useEffect, useState } from "react";
import { RecordingControls } from "./recording-controls";
import { RecordingErrors } from "./recording-errors";
import { TranscriptionDisplay } from "./transcription-display";
import { TranscriptionStatus } from "./transcription-status";

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
  const handleStart = async () => {
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
  };

  // Handle consent granted
  const handleConsentGranted = () => {
    const now = new Date();
    setConsentGranted(true);
    setConsentGrantedAt(now);
    setShowConsentBanner(false);
    // Start recording after consent is granted
    void handleStart();
  };

  // Handle consent denied
  const handleConsentDenied = () => {
    setShowConsentBanner(false);
  };

  // Handle stop click (with confirmation for short recordings)
  const handleStopClick = () => {
    if (recording.duration < 3) {
      setShowStopConfirm(true);
    } else {
      void handleFinalStop();
    }
  };

  // Handle final stop
  const handleFinalStop = async () => {
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
  };

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
          <div
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 transition-all duration-500 h-full flex flex-col ${
              recording.isRecording && !recording.isPaused
                ? "shadow-lg shadow-primary/10 ring-2 ring-primary/20"
                : "shadow-md"
            }`}
          >
            {/* Animated background pulse when recording */}
            {recording.isRecording && !recording.isPaused && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse pointer-events-none" />
            )}

            <div
              className={`relative p-8 flex flex-col ${
                externalLiveTranscriptionEnabled
                  ? "space-y-8 flex-1"
                  : "space-y-8"
              }`}
            >
              {/* Header with status */}
              <div className="flex items-start justify-between flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">
                    Live Recording
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {externalLiveTranscriptionEnabled
                      ? "Real-time audio capture with live transcription"
                      : "Direct audio capture from your microphone"}
                  </p>
                </div>
                {recording.isRecording && (
                  <Badge
                    variant={recording.isPaused ? "outline" : "default"}
                    className={`ml-2 ${
                      recording.isPaused
                        ? ""
                        : "animate-pulse bg-primary text-primary-foreground"
                    }`}
                  >
                    {recording.isPaused ? "Paused" : "Recording"}
                  </Badge>
                )}
              </div>

              {/* Errors and Status - Compact */}
              <div className="flex-shrink-0">
                <RecordingErrors
                  permissionDenied={recording.permissionDenied}
                  recorderError={recording.recorderError}
                  transcriptionError={transcription.transcriptionError}
                  isSaving={recording.isSaving}
                />
              </div>

              {/* Live Waveform - Large and prominent */}
              {(recording.isRecording || recording.isPaused) &&
                recording.stream && (
                  <div className="relative overflow-hidden rounded-xl border-2 border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 p-8 backdrop-blur-sm flex-shrink-0">
                    <div className="flex h-40 items-center justify-center">
                      <LiveWaveform
                        active={recording.isRecording}
                        barWidth={5}
                        barGap={2}
                        barRadius={8}
                        barColor="#71717a"
                        fadeEdges
                        fadeWidth={48}
                        sensitivity={0.8}
                        smoothingTimeConstant={0.85}
                        className="w-full"
                      />
                    </div>
                    {/* Subtle glow effect when recording */}
                    {recording.isRecording && !recording.isPaused && (
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
                    )}
                  </div>
                )}

              {/* Recording Controls - Centered and prominent */}
              <div className="flex flex-col items-center gap-6 flex-1 justify-center">
                <RecordingControls
                  isRecording={recording.isRecording}
                  isPaused={recording.isPaused}
                  duration={recording.duration}
                  isSaving={recording.isSaving}
                  permissionDenied={recording.permissionDenied}
                  formattedDuration={`${Math.floor(recording.duration / 60)
                    .toString()
                    .padStart(2, "0")}:${Math.floor(recording.duration % 60)
                    .toString()
                    .padStart(2, "0")}`}
                  onStart={handleStart}
                  onPause={recording.handlePause}
                  onResume={recording.handleResume}
                  onStop={handleStopClick}
                />
              </div>

              {/* Status indicators - Compact row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                {consentGranted && (
                  <div className="flex items-center gap-1.5">
                    <ConsentStatus status="granted" />
                    <span>Consent granted</span>
                  </div>
                )}
                {recording.isRecording && recording.wakeLockActive && (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Screen lock active</span>
                  </div>
                )}
                <TranscriptionStatus
                  isRecording={recording.isRecording}
                  liveTranscriptionEnabled={externalLiveTranscriptionEnabled}
                  isTranscribing={transcription.isTranscribing}
                />
              </div>
            </div>
          </div>
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

      {/* Consent Banner */}
      <ConsentBanner
        isOpen={showConsentBanner}
        onConsentGranted={handleConsentGranted}
        onConsentDenied={handleConsentDenied}
      />

      {/* Stop Confirmation Dialog */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opname stoppen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je opname is minder dan 3 seconden. Weet je zeker dat je wilt
              stoppen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Doorgaan met opnemen</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleFinalStop()}>
              Ja, stoppen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

