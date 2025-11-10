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
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";

export interface TranscriptSegment {
  text: string;
  speaker?: number;
  isFinal: boolean;
  timestamp: number;
}

interface UseLiveTranscriptionProps {
  microphone: MediaRecorder | null;
  isRecording: boolean;
  isPaused: boolean;
  audioChunksRef: React.MutableRefObject<Blob[]>;
}

export function useLiveTranscription({
  microphone,
  isRecording,
  isPaused,
  audioChunksRef,
}: UseLiveTranscriptionProps) {
  // State
  const [liveTranscriptionEnabled, setLiveTranscriptionEnabled] =
    useState(true);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [currentCaption, setCurrentCaption] = useState<string | undefined>();
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );

  // Deepgram
  const {
    connection,
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
  } = useDeepgram();

  // Microphone
  const { startMicrophone } = useMicrophone();

  // Refs
  const captionTimeout = useRef<NodeJS.Timeout | null>(null);
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

  // Load preference on mount
  useEffect(() => {
    try {
      const preference = getLiveTranscriptionPreferenceClient();
      setLiveTranscriptionEnabled(preference);
    } catch (error) {
      console.error("Failed to load live transcription preference:", error);
    }
  }, []);

  // Effect Event: Handle audio data (no transcription mode)
  const onAudioData = useEffectEvent((e: BlobEvent) => {
    console.log(
      "Audio data received (no transcription):",
      e.data.size,
      "bytes"
    );
    if (e.data.size > 0) {
      audioChunksRef.current.push(e.data);
    }
  });

  // Effect Event: Handle audio data with transcription
  const onAudioDataWithTranscription = useEffectEvent((e: BlobEvent) => {
    // iOS SAFARI FIX: Prevent packetZero from being sent
    if (e.data.size > 0) {
      console.log(
        "Audio data received (with transcription):",
        e.data.size,
        "bytes"
      );
      // Save audio chunk
      audioChunksRef.current.push(e.data);
      // Stream to Deepgram
      connection?.send(e.data);
    }
  });

  // Effect Event: Handle transcript
  const onTranscript = useEffectEvent((data: LiveTranscriptionEvent) => {
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
      const speaker = words && words.length > 0 ? words[0].speaker : undefined;

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
  });

  // Effect Event: Start microphone when ready
  const onStartMicrophone = useEffectEvent(() => {
    if (!isPaused && microphone?.state !== "recording") {
      console.log("Starting microphone, current state:", microphone?.state);
      startMicrophone();
    }
  });

  // Main effect: Handle audio data and transcription
  useEffect(() => {
    if (!microphone) {
      console.log("No microphone available");
      return;
    }
    if (!isRecording) {
      console.log("Not recording");
      return;
    }

    if (!liveTranscriptionEnabled) {
      console.log(
        "Live transcription disabled - setting up audio-only recording"
      );
      // Audio-only mode
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onAudioData);

      // Start microphone if not already started
      if (!isPaused && microphone.state !== "recording") {
        console.log("Starting microphone (no transcription mode)");
        onStartMicrophone();
      }

      return () => {
        microphone.removeEventListener(
          MicrophoneEvents.DataAvailable,
          onAudioData
        );
      };
    }

    if (!connection) {
      console.log("No Deepgram connection available yet");
      return;
    }
    if (connectionState !== LiveConnectionState.open) {
      console.log("Deepgram connection not open yet, state:", connectionState);
      return;
    }

    console.log("Setting up live transcription recording");

    // Transcription mode
    connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
    microphone.addEventListener(
      MicrophoneEvents.DataAvailable,
      onAudioDataWithTranscription
    );

    // Start microphone if not already started
    if (!isPaused && microphone.state !== "recording") {
      console.log(
        "Starting microphone (with transcription mode), current state:",
        microphone.state
      );
      onStartMicrophone();
    }

    return () => {
      connection.removeListener(
        LiveTranscriptionEvents.Transcript,
        onTranscript
      );
      microphone.removeEventListener(
        MicrophoneEvents.DataAvailable,
        onAudioDataWithTranscription
      );
      if (captionTimeout.current) {
        clearTimeout(captionTimeout.current);
      }
    };
    // Effect Events (onAudioData, onAudioDataWithTranscription, onTranscript, onStartMicrophone)
    // are intentionally NOT in the dependency array - they're non-reactive by design via useEffectEvent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    connection,
    microphone,
    connectionState,
    isRecording,
    isPaused,
    liveTranscriptionEnabled,
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

  // Effect Event: Handle toggle
  const handleToggle = useEffectEvent((enabled: boolean) => {
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
  });

  // Clear transcripts
  const clearTranscripts = () => {
    setTranscripts([]);
    setCurrentCaption(undefined);
    setTranscriptionError(null);
  };

  return {
    // State
    liveTranscriptionEnabled,
    transcripts,
    currentCaption,
    transcriptionError,
    isTranscribing:
      liveTranscriptionEnabled &&
      connectionState === LiveConnectionState.open &&
      isRecording &&
      !isPaused,

    // Handlers
    handleToggleTranscription: handleToggle,
    clearTranscripts,

    // Deepgram
    connectToDeepgram,
    disconnectFromDeepgram,
    connectionState,
  };
}

