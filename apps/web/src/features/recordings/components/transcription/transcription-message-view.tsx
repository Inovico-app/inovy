"use client";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { TranscriptionMessageBubble } from "./transcription-message-bubble";
import { useGroupedUtterances } from "../../hooks/use-grouped-utterances";
import type { TranscriptionMessageViewProps } from "./types";

export function TranscriptionMessageView({
  utterances,
  viewMode,
  speakersDetected,
  speakerNames,
  speakerUserIds,
  recordingId,
}: TranscriptionMessageViewProps) {
  const groupedUtterances = useGroupedUtterances(utterances);

  if (groupedUtterances.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Geen gedetailleerde transcriptie beschikbaar</p>
      </div>
    );
  }

  return (
    <Conversation className="h-[600px] bg-background/50">
      <ConversationContent className="space-y-0">
        {groupedUtterances.map((grouped, index) => (
          <TranscriptionMessageBubble
            key={`${grouped.start}-${grouped.speaker}-${index}`}
            groupedUtterance={grouped}
            viewMode={viewMode}
            speakersDetected={speakersDetected}
            speakerNames={speakerNames}
            speakerUserIds={speakerUserIds}
            recordingId={recordingId}
          />
        ))}
      </ConversationContent>
    </Conversation>
  );
}

