"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface TranscriptionViewerProps {
  transcriptionText: string;
  utterances?: Utterance[];
  confidence?: number;
  speakersDetected?: number;
}

export function TranscriptionViewer({
  transcriptionText,
  utterances,
  confidence,
  speakersDetected,
}: TranscriptionViewerProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!transcriptionText && (!utterances || utterances.length === 0)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Geen transcriptie beschikbaar
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transcriptie</CardTitle>
          <div className="flex items-center gap-2">
            {speakersDetected !== undefined && speakersDetected > 0 && (
              <Badge variant="outline">
                {speakersDetected} {speakersDetected === 1 ? "spreker" : "sprekers"}
              </Badge>
            )}
            {confidence !== undefined && (
              <Badge variant="outline">
                {Math.round(confidence * 100)}% vertrouwen
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {utterances && utterances.length > 0 ? (
          <div className="space-y-3">
            {utterances.map((utterance, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    Spreker {utterance.speaker + 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(utterance.start)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(utterance.confidence * 100)}%
                  </Badge>
                </div>
                <p className="text-sm">{utterance.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm whitespace-pre-wrap">{transcriptionText}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

