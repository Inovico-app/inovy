"use client";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getLiveTranscriptionPreferenceClient,
  setLiveTranscriptionPreferenceClient,
} from "@/lib/live-transcription-preferences";
import {
  LiveConnectionState,
  type LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "@/providers/DeepgramProvider";
import {
  MicrophoneEvents,
  useMicrophone,
} from "@/providers/MicrophoneProvider";
import {
  AlertCircle,
  CheckCircle2,
  Mic,
  Pause,
  Play,
  Square,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface LiveRecorderProps {
  onRecordingComplete: (
    audioBlob: Blob,
    transcription: string
  ) => Promise<void>;
}

interface TranscriptSegment {
  text: string;
  speaker?: number;
  isFinal: boolean;
  timestamp: number;
}

export function LiveRecorder({ onRecordingComplete }: LiveRecorderProps) {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Transcription state
  const [liveTranscriptionEnabled, setLiveTranscriptionEnabled] =
    useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [_currentCaption, setCurrentCaption] = useState<string | undefined>();

  // Errors
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );

  // Deepgram and Microphone
  const {
    connection,
    connectToDeepgram,
    connectionState,
    disconnectFromDeepgram,
  } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone } =
    useMicrophone();

  // Refs
  const audioChunksRef = useRef<Blob[]>([]);
  const captionTimeout = useRef<NodeJS.Timeout | null>(null);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Load live transcription preference on mount
  useEffect(() => {
    try {
      const preference = getLiveTranscriptionPreferenceClient();
      setLiveTranscriptionEnabled(preference);
    } catch (error) {
      console.error("Failed to load live transcription preference:", error);
    }
  }, []);

  // Setup microphone on mount
  useEffect(() => {
    const setup = async () => {
      try {
        await setupMicrophone();
      } catch (error) {
        console.error("Error setting up microphone:", error);
        if (error instanceof Error && error.name === "NotAllowedError") {
          setPermissionDenied(true);
        }
        setRecorderError("Kon microfoon niet initialiseren");
      }
    };

    void setup();

    return () => {
      stopMicrophone();
      if (captionTimeout.current) {
        clearTimeout(captionTimeout.current);
      }
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [setupMicrophone, stopMicrophone]);

  // Handle live transcription toggle
  const handleToggleLiveTranscription = (enabled: boolean) => {
    try {
      setLiveTranscriptionPreferenceClient(enabled);
      setLiveTranscriptionEnabled(enabled);

      toast.success(
        enabled
          ? "Live transcriptie ingeschakeld"
          : "Live transcriptie uitgeschakeld",
        {
          description: enabled
            ? "Gesproken tekst wordt live getranscribeerd tijdens opname"
            : "Alleen audio wordt opgenomen, zonder live transcriptie",
        }
      );
    } catch (error) {
      console.error("Failed to update live transcription preference:", error);
      toast.error("Fout bij opslaan van voorkeuren", {
        description: "Probeer het opnieuw",
      });
    }
  };

  // Handle start recording
  const handleStart = async () => {
    try {
      setPermissionDenied(false);
      setRecorderError(null);
      setTranscriptionError(null);
      setTranscripts([]);
      audioChunksRef.current = [];

      // Connect to Deepgram only if live transcription is enabled
      if (liveTranscriptionEnabled) {
        await connectToDeepgram({
          model: "nova-3",
          language: "nl",
          smart_format: true,
          diarize: true,
          punctuate: true,
          utterances: true,
          interim_results: true,
        });
      }

      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      if (error instanceof Error && error.name === "NotAllowedError") {
        setPermissionDenied(true);
      }
      setRecorderError("Kon opname niet starten");
    }
  };

  // Handle pause recording
  const handlePause = () => {
    if (microphone && microphone.state === "recording") {
      microphone.pause();
      setIsPaused(true);

      // Pause duration timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }
  };

  // Handle resume recording
  const handleResume = () => {
    if (microphone && microphone.state === "paused") {
      microphone.resume();
      setIsPaused(false);

      // Resume duration timer
      durationInterval.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  // Handle stop click (with confirmation for short recordings)
  const handleStopClick = () => {
    if (duration < 3) {
      setShowStopConfirm(true);
    } else {
      void handleStop();
    }
  };

  // Handle stop recording
  const handleStop = async () => {
    try {
      setShowStopConfirm(false);
      setIsSaving(true);

      // Stop duration timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      // Stop microphone
      stopMicrophone();

      // Disconnect from Deepgram
      disconnectFromDeepgram();

      // Combine audio chunks into single blob
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      if (audioBlob.size === 0) {
        throw new Error("Geen audio data opgenomen");
      }

      // Combine transcripts into single string
      const fullTranscript = transcripts.map((t) => t.text).join(" ");

      // Call completion handler
      await onRecordingComplete(audioBlob, fullTranscript);

      // Reset state
      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setTranscripts([]);
      audioChunksRef.current = [];
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecorderError(
        error instanceof Error ? error.message : "Fout bij stoppen van opname"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle audio data and transcription when connected
  useEffect(() => {
    if (!microphone) return;
    if (!isRecording) return;
    if (!liveTranscriptionEnabled) {
      // If transcription is disabled, only record audio
      const onData = (e: BlobEvent) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      // Start microphone if not already started
      if (!isPaused) {
        startMicrophone();
      }

      return () => {
        microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      };
    }

    if (!connection) return;
    if (connectionState !== LiveConnectionState.open) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX:
      // Prevent packetZero from being sent. If sent at size 0, the connection will close.
      if (e.data.size > 0) {
        // Save audio chunk for later
        audioChunksRef.current.push(e.data);

        // Stream to Deepgram
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      const thisCaption = data.channel.alternatives[0].transcript;

      // Update current caption for temporary display
      if (thisCaption !== "") {
        setCurrentCaption(thisCaption);
      }

      // Add to final transcripts when both flags are true
      if (isFinal && speechFinal && thisCaption !== "") {
        // Extract speaker info if available
        const words = data.channel.alternatives[0].words;
        const speaker =
          words && words.length > 0 ? words[0].speaker : undefined;

        setTranscripts((prev) => [
          ...prev,
          {
            text: thisCaption,
            speaker,
            isFinal: true,
            timestamp: Date.now(),
          },
        ]);

        // Clear caption after showing
        if (captionTimeout.current) {
          clearTimeout(captionTimeout.current);
        }
        captionTimeout.current = setTimeout(() => {
          setCurrentCaption(undefined);
          if (captionTimeout.current) {
            clearTimeout(captionTimeout.current);
          }
        }, 3000);
      }
    };

    // Add listeners
    connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
    microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

    // Start microphone if not already started
    if (!isPaused) {
      startMicrophone();
    }

    return () => {
      connection.removeListener(
        LiveTranscriptionEvents.Transcript,
        onTranscript
      );
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      if (captionTimeout.current) {
        clearTimeout(captionTimeout.current);
      }
    };
  }, [
    connection,
    microphone,
    connectionState,
    isRecording,
    isPaused,
    liveTranscriptionEnabled,
    startMicrophone,
  ]);

  // Keep connection alive when not streaming
  useEffect(() => {
    if (!liveTranscriptionEnabled) return;
    if (!connection) return;
    if (connectionState !== LiveConnectionState.open) return;

    // Keep alive when paused or not actively recording
    if (isPaused || !isRecording) {
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    }

    return () => {
      if (keepAliveInterval.current) {
        clearInterval(keepAliveInterval.current);
      }
    };
  }, [
    connection,
    connectionState,
    isPaused,
    isRecording,
    liveTranscriptionEnabled,
  ]);

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (transcripts.length > 0 && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Check if transcription is active
  const isTranscribing =
    liveTranscriptionEnabled &&
    connectionState === LiveConnectionState.open &&
    isRecording &&
    !isPaused;

  return (
    <>
      <div
        className={
          liveTranscriptionEnabled
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
              {isRecording && (
                <Badge
                  variant={isPaused ? "outline" : "default"}
                  className="ml-2"
                >
                  {isPaused ? "Gepauzeerd" : "Opnemen"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Live Transcription Toggle */}
            {!isRecording && (
              <div
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={() =>
                  handleToggleLiveTranscription(!liveTranscriptionEnabled)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggleLiveTranscription(!liveTranscriptionEnabled);
                  }
                }}
                aria-label="Toggle live transcriptie"
              >
                <div className="space-y-0.5 pointer-events-none">
                  <Label
                    htmlFor="live-transcription-toggle"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Live transcriptie
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Transcribeer gesproken tekst live tijdens opname
                  </p>
                </div>
                <div className="pointer-events-none">
                  <Switch
                    id="live-transcription-toggle"
                    checked={liveTranscriptionEnabled}
                  />
                </div>
              </div>
            )}

            {/* Permission Denied Error */}
            {permissionDenied && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Toegang tot microfoon geweigerd. Sta microfoontoegang toe in
                  je browserinstellingen om op te kunnen nemen.
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
                  disabled={isSaving || permissionDenied}
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
                <p
                  className="text-3xl font-mono font-bold tabular-nums"
                  role="timer"
                  aria-live="polite"
                >
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

            {/* Transcription Status */}
            {isRecording && liveTranscriptionEnabled && (
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
                      Transcriptie verbinding maken...
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Errors */}
            {(recorderError ?? transcriptionError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">Fout opgetreden:</p>
                  <p className="text-sm mt-1">
                    {recorderError ?? transcriptionError}
                  </p>
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
                {liveTranscriptionEnabled && (
                  <p className="text-xs mt-1">
                    Live transcriptie wordt automatisch gestart
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Transcription Card */}
        {liveTranscriptionEnabled && (
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <div>
                  <CardTitle>Live transcriptie</CardTitle>
                  <CardDescription>
                    Gesproken tekst wordt automatisch getranscribeerd
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="p-4 bg-muted/50 rounded-lg h-[500px] overflow-y-auto border"
                role="log"
                aria-live="polite"
                aria-label="Live transcriptie"
              >
                {transcripts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm text-center">
                      {isRecording
                        ? "Begin met praten om de transcriptie te zien..."
                        : "Start de opname om live transcriptie te zien"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map((segment, index) => (
                      <div
                        key={index}
                        className="p-3 bg-background rounded-md border"
                      >
                        <p className="text-sm leading-relaxed">
                          {segment.speaker !== undefined && (
                            <span className="font-semibold text-primary mr-2">
                              Spreker {segment.speaker}:
                            </span>
                          )}
                          {segment.text}
                        </p>
                      </div>
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
            <AlertDialogAction onClick={() => void handleStop()}>
              Ja, stoppen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

