"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";
import type { TranscriptionMessageBubbleProps } from "./types";

const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  "bg-pink-100 text-pink-900 dark:bg-pink-900 dark:text-pink-100",
  "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100",
];

const SPEAKER_BG_COLORS = [
  "bg-blue-50 dark:bg-blue-950",
  "bg-green-50 dark:bg-green-950",
  "bg-purple-50 dark:bg-purple-950",
  "bg-amber-50 dark:bg-amber-950",
  "bg-pink-50 dark:bg-pink-950",
  "bg-indigo-50 dark:bg-indigo-950",
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getSpeakerColor(speakerIndex: number): { text: string; bg: string } {
  const colorIndex = speakerIndex % SPEAKER_COLORS.length;
  return {
    text: SPEAKER_COLORS[colorIndex],
    bg: SPEAKER_BG_COLORS[colorIndex],
  };
}

export type TranscriptionMessageProps = HTMLAttributes<HTMLDivElement> & {
  isLeftAligned?: boolean;
};

export const TranscriptionMessage = ({
  className,
  isLeftAligned = false,
  ...props
}: TranscriptionMessageProps) => (
  <div
    className={cn(
      "group flex w-full items-end py-2 gap-2",
      isLeftAligned ? "justify-start" : "justify-end flex-row-reverse",
      className
    )}
    {...props}
  />
);

export type TranscriptionMessageContentProps =
  HTMLAttributes<HTMLDivElement> & {
    speakerColor?: { text: string; bg: string };
  };

export const TranscriptionMessageContent = ({
  children,
  className,
  speakerColor,
  ...props
}: TranscriptionMessageContentProps) => (
  <div
    className={cn(
      "flex flex-col gap-2 overflow-hidden rounded-lg text-sm max-w-[80%] px-4 py-3",
      speakerColor ? speakerColor.bg : "bg-blue-100 dark:bg-blue-900",
      "text-foreground hover:shadow-md transition-shadow",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export function TranscriptionMessageBubble({
  utterance,
  viewMode,
}: TranscriptionMessageBubbleProps) {
  const speakerColor = getSpeakerColor(utterance.speaker);
  const isLeftAligned = utterance.speaker % 2 === 0 && viewMode === "detailed";

  return (
    <TranscriptionMessage isLeftAligned={isLeftAligned}>
      <TranscriptionMessageContent speakerColor={speakerColor}>
        {viewMode === "detailed" && (
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-xs ${speakerColor.text}`}
            >
              Spreker {utterance.speaker + 1}
            </Badge>
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">
          {utterance.text}
        </p>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTime(utterance.start)}</span>
          <Badge variant="outline" className="text-xs">
            {Math.round(utterance.confidence * 100)}%
          </Badge>
        </div>
      </TranscriptionMessageContent>
    </TranscriptionMessage>
  );
}

