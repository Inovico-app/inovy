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
    transcription: string
  ) => Promise<void>;
}

export function LiveRecorder({ onRecordingComplete }: LiveRecorderProps) {
  const [showStopConfirm, setShowStopConfirm] = useState(false);

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

      // Call completion handler
      await onRecordingComplete(audioBlob, fullTranscript);

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

