"use client";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { useEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new AbortController();
    const { signal } = controller;
    let activeSpeaker: string | null = null;

    const applyHighlight = (speaker: string) => {
      const bubbles = container.querySelectorAll<HTMLElement>("[data-speaker]");
      for (const el of bubbles) {
        if (el.dataset.speaker === speaker) {
          el.classList.remove("opacity-35");
        } else {
          el.classList.add("opacity-35");
        }
      }
    };

    const clearHighlight = () => {
      const bubbles = container.querySelectorAll<HTMLElement>("[data-speaker]");
      for (const el of bubbles) {
        el.classList.remove("opacity-35");
      }
    };

    container.addEventListener(
      "pointerover",
      (e: PointerEvent) => {
        const bubble = (e.target as HTMLElement).closest<HTMLElement>(
          "[data-speaker]"
        );
        if (!bubble) return;
        const speaker = bubble.dataset.speaker!;
        if (speaker === activeSpeaker) return;
        activeSpeaker = speaker;
        applyHighlight(speaker);
      },
      { signal }
    );

    container.addEventListener(
      "pointerleave",
      () => {
        if (activeSpeaker === null) return;
        activeSpeaker = null;
        clearHighlight();
      },
      { signal }
    );

    return () => controller.abort();
  }, []);

  if (groupedUtterances.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Geen gedetailleerde transcriptie beschikbaar</p>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
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
    </div>
  );
}

