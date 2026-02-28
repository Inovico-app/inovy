"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Utterance } from "@/server/dto/ai-insight.dto";
import { useState } from "react";
import { TranscriptionEditView } from "./transcription-edit-view";
import { TranscriptionTabs } from "./transcription-tabs";
import type { TranscriptionEditorProps } from "./types";

export function TranscriptionEditor({
  recording,
  transcriptionInsights,
}: TranscriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!transcriptionInsights) {
    return null;
  }

  const {
    transcriptionText,
    isTranscriptionManuallyEdited,
    transcriptionLastEditedAt,
  } = recording;
  const {
    speakersDetected,
    confidenceScore,
    utterances,
    speakerNames,
    speakerUserIds,
    content: { utterances: contentUtterances },
  } = transcriptionInsights;

  if (!transcriptionText) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Geen transcriptie beschikbaar
        </CardContent>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <TranscriptionEditView
            recordingId={recording.id}
            transcriptionText={transcriptionText}
            utterances={utterances ?? (contentUtterances as Utterance[]) ?? []}
            speakerNames={speakerNames}
            speakerUserIds={speakerUserIds}
            isManuallyEdited={isTranscriptionManuallyEdited}
            lastEditedAt={transcriptionLastEditedAt}
            speakersDetected={speakersDetected ?? 0}
            confidence={confidenceScore ?? 0}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <TranscriptionTabs
      utterances={utterances ?? (contentUtterances as Utterance[]) ?? []}
      transcriptionText={transcriptionText}
      recordingId={recording.id}
      isManuallyEdited={isTranscriptionManuallyEdited}
      lastEditedAt={transcriptionLastEditedAt}
      speakersDetected={speakersDetected ?? 0}
      confidence={confidenceScore ?? 0}
      speakerNames={speakerNames}
      speakerUserIds={speakerUserIds}
      onEditStart={() => setIsEditing(true)}
    />
  );
}

