"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingError } from "./processing-error";
import { TranscriptionEditor } from "./transcription-editor";

interface TranscriptionSectionProps {
  recordingId: string;
  recordingTitle: string;
  transcriptionStatus: "pending" | "processing" | "completed" | "failed";
  transcriptionText: string | null;
  isTranscriptionManuallyEdited?: boolean;
  transcriptionLastEditedById?: string | null;
  transcriptionLastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
}

export function TranscriptionSection({
  recordingId,
  recordingTitle,
  transcriptionStatus,
  transcriptionText,
  isTranscriptionManuallyEdited,
  transcriptionLastEditedById,
  transcriptionLastEditedAt,
  speakersDetected,
  confidence,
}: TranscriptionSectionProps) {
  if (transcriptionStatus === "completed" && transcriptionText) {
    return (
      <TranscriptionEditor
        recordingId={recordingId}
        transcriptionText={transcriptionText}
        isManuallyEdited={isTranscriptionManuallyEdited}
        _lastEditedById={transcriptionLastEditedById}
        lastEditedAt={transcriptionLastEditedAt}
        speakersDetected={speakersDetected}
        confidence={confidence}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcriptie</CardTitle>
      </CardHeader>
      <CardContent>
        {transcriptionStatus === "processing" ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Transcriptie wordt verwerkt...</p>
            <p className="text-sm mt-2">
              Dit kan enkele minuten duren, afhankelijk van de lengte van de
              opname.
            </p>
          </div>
        ) : transcriptionStatus === "failed" ? (
          <ProcessingError
            title="Transcriptie Mislukt"
            recordingTitle={recordingTitle}
            message="Er is een fout opgetreden bij het transcriberen van deze opname. Dit kan te wijten zijn aan problemen met de audiokwaliteit, een niet-ondersteund audioformaat, of een tijdelijk serviceprobleem."
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Transcriptie in behandeling</p>
            <p className="text-sm mt-2">Verwerking begint binnenkort.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

