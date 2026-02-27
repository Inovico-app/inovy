"use client";

import { cn } from "@/lib/utils";
import { createRef, useCallback, useEffect, useRef } from "react";
import { useAudioTranscriptSync } from "../../hooks/use-audio-transcript-sync";
import { useAutoScrollPause } from "../../hooks/use-auto-scroll-pause";
import { useGroupedUtterances } from "../../hooks/use-grouped-utterances";
import { TranscriptionMessageBubble } from "./transcription-message-bubble";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const bubbleRefsRef = useRef<
    Map<number, React.RefObject<HTMLDivElement | null>>
  >(new Map());

  const getBubbleRef = useCallback((index: number) => {
    const map = bubbleRefsRef.current;
    if (!map.has(index)) {
      map.set(index, createRef<HTMLDivElement>());
    }
    return map.get(index)!;
  }, []);

  const { activeGroupIndex } = useAudioTranscriptSync(groupedUtterances);
  const { isAutoScrollPaused, resumeAutoScroll, markProgrammaticScroll } =
    useAutoScrollPause({ scrollContainerRef: scrollRef });

  // Auto-scroll to active utterance
  useEffect(() => {
    if (activeGroupIndex === null || isAutoScrollPaused) return;

    const ref = bubbleRefsRef.current.get(activeGroupIndex);
    const el = ref?.current;
    if (!el) return;

    markProgrammaticScroll();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    el.scrollIntoView({
      behavior: prefersReducedMotion ? "instant" : "smooth",
      block: "center",
    });
  }, [activeGroupIndex, isAutoScrollPaused, markProgrammaticScroll]);

  // Speaker hover highlight (existing behavior)
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
      <div
        ref={scrollRef}
        className={cn(
          "relative h-[600px] overflow-y-auto overscroll-y-contain bg-background/50 rounded-lg"
        )}
        role="log"
        aria-label="Transcriptie"
      >
        <div className="p-4 max-w-screen-lg mx-auto w-full space-y-0">
          {groupedUtterances.map((grouped, index) => (
            <TranscriptionMessageBubble
              key={`${grouped.start}-${grouped.speaker}-${index}`}
              ref={getBubbleRef(index)}
              groupedUtterance={grouped}
              viewMode={viewMode}
              speakersDetected={speakersDetected}
              speakerNames={speakerNames}
              speakerUserIds={speakerUserIds}
              recordingId={recordingId}
              isActive={activeGroupIndex === index}
            />
          ))}
        </div>

        {isAutoScrollPaused && activeGroupIndex !== null && (
          <button
            onClick={resumeAutoScroll}
            className={cn(
              "absolute bottom-4 left-1/2 -translate-x-1/2 z-10",
              "rounded-full px-4 py-2 text-xs font-medium",
              "bg-primary text-primary-foreground shadow-lg",
              "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
              "hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "touch-action-manipulation"
            )}
            aria-label="Hervat automatisch scrollen"
          >
            Volg afspelen
          </button>
        )}
      </div>
    </div>
  );
}

