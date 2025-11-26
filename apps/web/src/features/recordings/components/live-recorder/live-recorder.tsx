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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConsentBanner } from "@/features/recordings/components/consent-banner";
import { ConsentStatus } from "@/features/recordings/components/consent-status";
import { useLiveRecording } from "@/features/recordings/hooks/use-live-recording";
import { useLiveTranscription } from "@/features/recordings/hooks/use-live-transcription";
import { logger } from "@/lib";
import { useState } from "react";
import {
  HelpText,
  RecordingControls,
  RecordingErrors,
  TranscriptionDisplay,
  TranscriptionSettings,
  TranscriptionStatus,
} from "./index";

interface LiveRecorderProps {
  onRecordingComplete: (
    audioBlob: Blob,
    transcription: string,
    consentGranted: boolean,
    consentGrantedAt: Date
  ) => Promise<void>;
}

export function LiveRecorder({ onRecordingComplete }: LiveRecorderProps) {
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

  // Handle start recording
  const handleStart = async () => {
    // Show consent banner if consent not yet granted
    if (!consentGranted) {
      setShowConsentBanner(true);
      return;
    }

    try {
      if (transcription.liveTranscriptionEnabled) {
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
          transcription.liveTranscriptionEnabled
            ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
            : ""
        }
      >
        {/* Main Recording Card */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live opnemen</CardTitle>
                <CardDescription>
                  Neem direct audio op via je microfoon met live transcriptie
                </CardDescription>
              </div>
              {recording.isRecording && (
                <Badge
                  variant={recording.isPaused ? "outline" : "default"}
                  className="ml-2"
                >
                  {recording.isPaused ? "Gepauzeerd" : "Opnemen"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Live Transcription Toggle */}
            <TranscriptionSettings
              enabled={transcription.liveTranscriptionEnabled}
              onToggle={transcription.handleToggleTranscription}
              isRecording={recording.isRecording}
            />

            {/* Errors and Status */}
            <RecordingErrors
              permissionDenied={recording.permissionDenied}
              recorderError={recording.recorderError}
              transcriptionError={transcription.transcriptionError}
              isSaving={recording.isSaving}
            />

            {/* Consent Status */}
            {consentGranted && (
              <div className="flex items-center gap-2">
                <ConsentStatus status="granted" />
                <span className="text-sm text-muted-foreground">
                  Consent granted for recording
                </span>
              </div>
            )}

            {/* Wake Lock Status */}
            {recording.isRecording && recording.wakeLockActive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-500"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Scherm blijft actief tijdens opname</span>
              </div>
            )}
            {recording.isRecording &&
              recording.wakeLockSupported &&
              !recording.wakeLockActive && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v10" />
                    <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
                  </svg>
                  <span>Opname kan pauzeren bij vergrendeld scherm</span>
                </div>
              )}

            {/* Recording Controls */}
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

            {/* Transcription Status */}
            <TranscriptionStatus
              isRecording={recording.isRecording}
              liveTranscriptionEnabled={transcription.liveTranscriptionEnabled}
              isTranscribing={transcription.isTranscribing}
            />

            {/* Help Text */}
            <HelpText
              isRecording={recording.isRecording}
              isSaving={recording.isSaving}
              liveTranscriptionEnabled={transcription.liveTranscriptionEnabled}
            />
          </CardContent>
        </Card>

        {/* Live Transcription Card */}
        {transcription.liveTranscriptionEnabled && (
          <TranscriptionDisplay
            transcripts={transcription.transcripts}
            isRecording={recording.isRecording}
          />
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

