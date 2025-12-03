import type { TranscriptSegment } from "@/features/recordings/hooks/use-live-transcription";
import { Mic, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

interface TranscriptionDisplayProps {
  transcripts: TranscriptSegment[];
  isRecording: boolean;
}

export function TranscriptionDisplay({
  transcripts,
  isRecording,
}: TranscriptionDisplayProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (transcripts.length > 0 && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts]);

  return (
    <div className="relative flex flex-col rounded-2xl border bg-gradient-to-br from-card via-card to-card/50 shadow-md overflow-hidden h-full">
      {/* Header */}
      <div className="relative p-6 border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Live Transcription</h2>
            <p className="text-sm text-muted-foreground">
              Real-time speech-to-text conversion
            </p>
          </div>
        </div>
        {isRecording && transcripts.length > 0 && (
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              Active
            </span>
          </div>
        )}
      </div>

      {/* Transcription Content */}
      <div
        className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-muted/20 via-background to-background"
        role="log"
        aria-live="polite"
        aria-label="Live transcription"
      >
        {transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-4 rounded-full bg-muted/50">
              <Mic className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isRecording
                  ? "Start speaking to see transcription..."
                  : "Start recording to see live transcription"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRecording
                  ? "Your words will appear here in real-time"
                  : "Transcription will appear here once you start"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {transcripts.map((segment, index) => (
              <div
                key={index}
                className="group relative p-4 bg-background rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/20"
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                }}
              >
                {segment.speaker !== undefined && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-primary/10 text-primary">
                      Speaker {segment.speaker}
                    </span>
                  </div>
                )}
                <p className="text-base leading-relaxed text-foreground">
                  {segment.text}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

