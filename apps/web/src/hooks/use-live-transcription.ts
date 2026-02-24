"use client";

import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { useEffect, useRef, useState } from "react";

export interface TranscriptSegment {
  text: string;
  isFinal: boolean;
  confidence: number;
  speaker?: number;
  timestamp: number;
}

export interface UseLiveTranscriptionReturn {
  isConnected: boolean;
  isTranscribing: boolean;
  transcript: TranscriptSegment[];
  fullTranscript: string;
  startTranscription: (stream: MediaStream) => Promise<void>;
  stopTranscription: () => void;
  error: string | null;
}

export function useLiveTranscription(): UseLiveTranscriptionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<{ finish: () => void } | null>(null);
  const deepgramRef = useRef<unknown>(null);

  useEffect(() => {
    // Initialize Deepgram client (API key should be passed from environment)
    // Note: In production, you should fetch the API key from your backend
    // For now, we'll handle this in the component that uses this hook
    return () => {
      if (connectionRef.current) {
        connectionRef.current.finish();
      }
    };
  }, []);

  // React Compiler automatically memoizes these functions
  const startTranscription = async (stream: MediaStream) => {
    try {
      setError(null);

      // Fetch temporary token from server for security
      const tokenResponse = await fetch("/api/deepgram/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to fetch Deepgram token");
      }
      const { token } = await tokenResponse.json();

      if (!token) {
        throw new Error("Deepgram token not available");
      }

      const deepgram = createClient(token);
      deepgramRef.current = deepgram;

      const connection = deepgram.listen.live({
        model: "nova-3",
        language: "nl",
        smart_format: true,
        diarize: true,
        punctuate: true,
        utterances: true,
        interim_results: true,
      });

      connectionRef.current = connection;

      // Handle connection open
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("Deepgram connection opened");
        setIsConnected(true);
        setIsTranscribing(true);
      });

      // Handle transcription results
      connection.on(
        LiveTranscriptionEvents.Transcript,
        (data: {
          channel?: {
            alternatives?: Array<{
              transcript?: string;
              confidence?: number;
              words?: Array<{ speaker?: number }>;
            }>;
          };
          is_final?: boolean;
        }) => {
          const channel = data.channel;
          const alternative = channel?.alternatives?.[0];

          if (!alternative?.transcript) return;

          const segment: TranscriptSegment = {
            text: alternative.transcript,
            isFinal: data.is_final ?? false,
            confidence: alternative.confidence ?? 0,
            speaker: alternative.words?.[0]?.speaker,
            timestamp: Date.now(),
          };

          setTranscript((prev) => {
            // If this is a final result, add it
            if (segment.isFinal) {
              setFullTranscript((fullText) => {
                const newText = fullText
                  ? `${fullText} ${segment.text}`
                  : segment.text;
                return newText;
              });
              return [...prev, segment];
            }

            // If interim, replace the last interim segment
            const lastSegment = prev[prev.length - 1];
            if (lastSegment && !lastSegment.isFinal) {
              return [...prev.slice(0, -1), segment];
            }

            return [...prev, segment];
          });
        }
      );

      // Handle errors
      connection.on(
        LiveTranscriptionEvents.Error,
        (err: { message?: string }) => {
          console.error("Deepgram error:", err);
          setError(err.message || "Transcription error");
          setIsTranscribing(false);
        }
      );

      // Handle connection close
      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("Deepgram connection closed");
        setIsConnected(false);
        setIsTranscribing(false);
      });

      // Send audio from the stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && connection.getReadyState() === 1) {
          connection.send(event.data);
        }
      };

      mediaRecorder.start(250); // Send audio every 250ms

      // Store mediaRecorder for cleanup
      (connection as unknown as Record<string, unknown>)._mediaRecorder =
        mediaRecorder;
    } catch (err) {
      console.error("Error starting transcription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start transcription"
      );
      setIsTranscribing(false);
    }
  };

  const stopTranscription = () => {
    if (connectionRef.current) {
      const connection = connectionRef.current;

      // Stop media recorder if exists
      const connWithRecorder = connection as Record<
        string,
        { stop?: () => void }
      >;
      if (connWithRecorder._mediaRecorder?.stop) {
        connWithRecorder._mediaRecorder.stop();
      }

      connection.finish();
      connectionRef.current = null;
    }

    setIsConnected(false);
    setIsTranscribing(false);
  };

  return {
    isConnected,
    isTranscribing,
    transcript,
    fullTranscript,
    startTranscription,
    stopTranscription,
    error,
  };
}

