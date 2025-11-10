import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TranscriptSegment } from "@/features/recordings/hooks/use-live-transcription";
import { CheckCircle2 } from "lucide-react";
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
  );
}

