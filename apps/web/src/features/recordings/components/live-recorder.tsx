"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useLiveTranscription } from "@/hooks/use-live-transcription";
import { Mic, Square, Pause, Play, AlertCircle, CheckCircle2 } from "lucide-react";

interface LiveRecorderProps {
  projectId: string;
  onRecordingComplete: (audioBlob: Blob, transcription: string) => Promise<void>;
}

export function LiveRecorder({ projectId: _projectId, onRecordingComplete }: LiveRecorderProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const {
    isRecording,
    isPaused,
    audioLevel,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    error: recorderError,
  } = useAudioRecorder();

  const {
    isTranscribing,
    transcript,
    fullTranscript,
    startTranscription,
    stopTranscription,
    error: transcriptionError,
  } = useLiveTranscription();

  const handleStart = async () => {
    try {
      setPermissionDenied(false);
      
      // Start audio recording
      await startRecording();

      // Get the media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      mediaStreamRef.current = stream;

      // Start live transcription
      await startTranscription(stream);
    } catch (error) {
      console.error("Error starting recording:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermissionDenied(true);
      }
    }
  };

  const handleStopClick = () => {
    if (duration < 3) {
      // If recording is very short, show confirmation
      setShowStopConfirm(true);
    } else {
      handleStop();
    }
  };

  const handleStop = async () => {
    try {
      setShowStopConfirm(false);
      setIsSaving(true);

      // Stop transcription
      stopTranscription();

      // Stop recording and get audio blob
      const audioBlob = await stopRecording();

      if (!audioBlob) {
        throw new Error("No audio data recorded");
      }

      // Clean up media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Call the completion handler with audio and transcription
      await onRecordingComplete(audioBlob, fullTranscript);
    } catch (error) {
      console.error("Error stopping recording:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = () => {
    pauseRecording();
  };

  const handleResume = () => {
    resumeRecording();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Show final segments only
  const finalSegments = transcript.filter(seg => seg.isFinal);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Live opnemen</CardTitle>
              <CardDescription>
                Neem direct audio op via je microfoon met live transcriptie
              </CardDescription>
            </div>
            {isRecording && (
              <Badge variant={isPaused ? "outline" : "default"} className="ml-2">
                {isPaused ? "Gepauzeerd" : "Opnemen"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Denied Error */}
          {permissionDenied && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Toegang tot microfoon geweigerd. Sta microfoontoegang toe in je browserinstellingen om op te kunnen nemen.
              </AlertDescription>
            </Alert>
          )}

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="rounded-full w-16 h-16"
                disabled={isSaving}
                aria-label="Start opname"
              >
                <Mic className="w-6 h-6" />
              </Button>
            ) : (
              <>
                {!isPaused ? (
                  <Button
                    onClick={handlePause}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-16 h-16"
                    aria-label="Pauzeer opname"
                  >
                    <Pause className="w-6 h-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleResume}
                    size="lg"
                    variant="outline"
                    className="rounded-full w-16 h-16"
                    aria-label="Hervat opname"
                  >
                    <Play className="w-6 h-6" />
                  </Button>
                )}
                
                <Button
                  onClick={handleStopClick}
                  size="lg"
                  variant="destructive"
                  className="rounded-full w-16 h-16"
                  disabled={isSaving}
                  aria-label="Stop opname"
                >
                  <Square className="w-6 h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Duration Display */}
          {isRecording && (
            <div className="text-center space-y-1">
              <p className="text-3xl font-mono font-bold tabular-nums" role="timer" aria-live="polite">
                {formatDuration(duration)}
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                {isPaused ? (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Gepauzeerd</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                    <span>Opnemen...</span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Audio Level Indicator */}
          {isRecording && !isPaused && (
            <div className="space-y-2" role="group" aria-label="Audio niveau indicator">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Audio niveau</p>
                <p className="text-xs text-muted-foreground">{Math.round(audioLevel * 100)}%</p>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-100 rounded-full"
                  style={{ 
                    width: `${audioLevel * 100}%`,
                    backgroundColor: audioLevel > 0.7 ? '#22c55e' : audioLevel > 0.3 ? '#eab308' : '#64748b'
                  }}
                  role="progressbar"
                  aria-valuenow={Math.round(audioLevel * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          )}

          {/* Transcription Status */}
          {isRecording && (
            <div className="flex items-center justify-center gap-2 text-sm">
              {isTranscribing ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Live transcriptie actief
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Transcriptie niet beschikbaar
                  </span>
                </>
              )}
            </div>
          )}

          {/* Live Transcription Display */}
          {isRecording && finalSegments.length > 0 && (
            <div className="mt-2 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto border" role="log" aria-live="polite" aria-label="Live transcriptie">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-sm font-semibold">Live transcriptie:</p>
              </div>
              <div className="space-y-2">
                {finalSegments.map((segment, index) => (
                  <p key={index} className="text-sm leading-relaxed">
                    {segment.speaker !== undefined && (
                      <span className="font-semibold text-primary">
                        Spreker {segment.speaker}:{" "}
                      </span>
                    )}
                    {segment.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {(recorderError ?? transcriptionError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold">Fout opgetreden:</p>
                <p className="text-sm mt-1">{recorderError ?? transcriptionError}</p>
              </AlertDescription>
            </Alert>
          )}

          {isSaving && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Opname wordt opgeslagen en geüpload...
              </AlertDescription>
            </Alert>
          )}

          {/* Help Text */}
          {!isRecording && !isSaving && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Klik op de microfoon knop om te beginnen met opnemen</p>
              <p className="text-xs mt-1">Live transcriptie wordt automatisch gestart</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stop Confirmation Dialog */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Opname stoppen?</AlertDialogTitle>
            <AlertDialogDescription>
              Je opname is minder dan 3 seconden. Weet je zeker dat je wilt stoppen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Doorgaan met opnemen</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop}>
              Ja, stoppen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

