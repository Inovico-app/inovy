"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { TranscriptionTabs } from "./transcription-tabs";
import { TranscriptionEditView } from "./transcription-edit-view";
import type { TranscriptionEditorProps } from "./types";

export function TranscriptionEditor({
  recordingId,
  transcriptionText,
  utterances,
  isManuallyEdited,
  lastEditedById,
  lastEditedAt,
  speakersDetected,
  confidence,
}: TranscriptionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

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
            recordingId={recordingId}
            transcriptionText={transcriptionText}
            isManuallyEdited={isManuallyEdited}
            lastEditedAt={lastEditedAt}
            speakersDetected={speakersDetected}
            confidence={confidence}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <TranscriptionTabs
      utterances={utterances}
      transcriptionText={transcriptionText}
      recordingId={recordingId}
      isManuallyEdited={isManuallyEdited}
      lastEditedAt={lastEditedAt}
      speakersDetected={speakersDetected}
      confidence={confidence}
      onEditStart={() => setIsEditing(true)}
    />
  );
}

