"use client";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { TranscriptionMessageBubble } from "./transcription-message-bubble";
import type { TranscriptionMessageViewProps } from "./types";

export function TranscriptionMessageView({
  utterances,
  viewMode,
  speakersDetected,
  speakerNames,
  speakerUserIds,
}: TranscriptionMessageViewProps) {
  if (!utterances || utterances.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Geen gedetailleerde transcriptie beschikbaar</p>
      </div>
    );
  }

  return (
    <Conversation className="h-[600px] bg-background/50">
      <ConversationContent className="space-y-0">
        {utterances.map((utterance, index) => (
          <TranscriptionMessageBubble
            key={index}
            utterance={utterance}
            viewMode={viewMode}
            speakersDetected={speakersDetected}
            speakerNames={speakerNames}
            speakerUserIds={speakerUserIds}
          />
        ))}
      </ConversationContent>
    </Conversation>
  );
}

