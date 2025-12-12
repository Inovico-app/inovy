"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeUsageIndicator } from "@/features/knowledge-base/components/knowledge-usage-indicator";
import { PIIRedaction } from "../pii-redaction";
import { ProcessingError } from "../processing-error";
import { TranscriptionEditor } from "./transcription-editor";
import type { TranscriptionSectionProps } from "./types";

export function TranscriptionSection({
  recording,
  transcriptionInsights,
  knowledgeUsed,
}: TranscriptionSectionProps) {
  const { transcriptionStatus, transcriptionText } = recording;

  if (transcriptionStatus !== "completed" || !transcriptionText) {
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
              recordingTitle={recording.title}
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

  return (
    <div className="space-y-4">
      <TranscriptionEditor
        recording={recording}
        transcriptionInsights={transcriptionInsights}
      />
      <PIIRedaction
        recordingId={recording.id}
        transcriptionText={transcriptionText}
      />
      {knowledgeUsed && knowledgeUsed.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <KnowledgeUsageIndicator
              knowledgeEntryIds={knowledgeUsed}
              variant="compact"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

