"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useLiveTranscription } from "@/hooks/use-live-transcription";
import { Mic, Square, Pause, Play } from "lucide-react";

interface LiveRecorderProps {
  projectId: string;
  onRecordingComplete: (audioBlob: Blob, transcription: string) => Promise<void>;
}

export function LiveRecorder({ projectId, onRecordingComplete }: LiveRecorderProps) {
  const [isSaving, setIsSaving] = useState(false);
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
    }
  };

  const handleStop = async () => {
    try {
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Live opnemen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <Button
              onClick={handleStart}
              size="lg"
              className="rounded-full w-16 h-16"
              disabled={isSaving}
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
                >
                  <Pause className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  size="lg"
                  variant="outline"
                  className="rounded-full w-16 h-16"
                >
                  <Play className="w-6 h-6" />
                </Button>
              )}
              
              <Button
                onClick={handleStop}
                size="lg"
                variant="destructive"
                className="rounded-full w-16 h-16"
                disabled={isSaving}
              >
                <Square className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {/* Duration Display */}
        {isRecording && (
          <div className="text-center">
            <p className="text-2xl font-mono font-bold">
              {formatDuration(duration)}
            </p>
            <p className="text-sm text-muted-foreground">
              {isPaused ? "Gepauzeerd" : "Opnemen..."}
            </p>
          </div>
        )}

        {/* Audio Level Indicator */}
        {isRecording && !isPaused && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Audio niveau</p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Transcription Status */}
        {isTranscribing && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span>Live transcriptie actief</span>
          </div>
        )}

        {/* Live Transcription Display */}
        {isRecording && finalSegments.length > 0 && (
          <div className="mt-4 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
            <p className="text-sm font-semibold mb-2">Live transcriptie:</p>
            <div className="space-y-2">
              {finalSegments.map((segment, index) => (
                <p key={index} className="text-sm">
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
        {(recorderError || transcriptionError) && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <p className="text-sm font-semibold">Fout:</p>
            <p className="text-sm">{recorderError || transcriptionError}</p>
          </div>
        )}

        {isSaving && (
          <div className="text-center text-sm text-muted-foreground">
            Opname opslaan...
          </div>
        )}
      </CardContent>
    </Card>
  );
}

