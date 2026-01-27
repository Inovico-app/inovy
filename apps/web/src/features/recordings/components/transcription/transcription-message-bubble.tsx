"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import { Copy } from "lucide-react";
import type { HTMLAttributes } from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
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

const SPEAKER_AVATAR_COLORS = [
  "bg-blue-200 dark:bg-blue-800",
  "bg-green-200 dark:bg-green-800",
  "bg-purple-200 dark:bg-purple-800",
  "bg-amber-200 dark:bg-amber-800",
  "bg-pink-200 dark:bg-pink-800",
  "bg-indigo-200 dark:bg-indigo-800",
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getSpeakerColor(speakerIndex: number): {
  text: string;
  bg: string;
  avatar: string;
} {
  const colorIndex = speakerIndex % SPEAKER_COLORS.length;
  return {
    text: SPEAKER_COLORS[colorIndex],
    bg: SPEAKER_BG_COLORS[colorIndex],
    avatar: SPEAKER_AVATAR_COLORS[colorIndex],
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
  speakerNames,
  speakerUserIds,
}: TranscriptionMessageBubbleProps) {
  const speakerColor = getSpeakerColor(utterance.speaker);
  const isLeftAligned = utterance.speaker % 2 === 0 && viewMode === "detailed";
  const { data: users = [] } = useOrganizationUsersQuery();

  // Get speaker display info
  const speakerInfo = useMemo(() => {
    const speakerKey = utterance.speaker.toString();
    const userId = speakerUserIds?.[speakerKey];
    const customName = speakerNames?.[speakerKey];
    const defaultName = `Spreker ${utterance.speaker + 1}`;

    if (userId) {
      const user = users.find((u) => u.id === userId);
      if (user) {
        const fullName = [user.given_name, user.family_name]
          .filter(Boolean)
          .join(" ");
        return {
          name: fullName || user.email || defaultName,
          userId: user.id,
          email: user.email,
          image: null, // Organization users query doesn't return image
        };
      }
    }

    return {
      name: customName || defaultName,
      userId: null,
      email: null,
      image: null,
    };
  }, [utterance.speaker, speakerNames, speakerUserIds, users]);

  const handleJumpToTimestamp = useCallback(() => {
    window.location.hash = `t=${utterance.start}`;
  }, [utterance.start]);

  const handleCopyUtterance = useCallback(async () => {
    const text = `${speakerInfo.name} [${formatTime(
      utterance.start
    )}]: ${utterance.text}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Utterance gekopieerd naar klembord");
    } catch (error) {
      console.error("Failed to copy utterance:", error);
      toast.error("Fout bij kopiëren naar klembord");
    }
  }, [speakerInfo.name, utterance.start, utterance.text]);

  // Get user initials for avatar fallback
  const userInitials = useMemo(() => {
    if (speakerInfo.userId && speakerInfo.name) {
      return speakerInfo.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter((char) => char !== undefined)
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return (utterance.speaker + 1).toString();
  }, [speakerInfo.userId, speakerInfo.name, utterance.speaker]);

  return (
    <TranscriptionMessage isLeftAligned={isLeftAligned}>
      {viewMode === "detailed" && (
        <Avatar className="flex-shrink-0 w-8 h-8">
          {speakerInfo.image ? (
            <AvatarImage src={speakerInfo.image} alt={speakerInfo.name} />
          ) : null}
          <AvatarFallback
            className={cn(speakerColor.avatar, "font-semibold text-xs")}
          >
            {userInitials}
          </AvatarFallback>
        </Avatar>
      )}
      <TranscriptionMessageContent speakerColor={speakerColor}>
        {viewMode === "detailed" && (
          <div className="mb-1 flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`text-xs ${speakerColor.text}`}
              aria-label={speakerInfo.name}
            >
              {speakerInfo.name}
            </Badge>
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">
          {utterance.text}
        </p>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={handleJumpToTimestamp}
            className="hover:underline cursor-pointer"
            title="Ga naar dit moment in de opname"
            aria-label={`Ga naar ${formatTime(utterance.start)}`}
          >
            <span aria-label={`Starttijd ${formatTime(utterance.start)}`}>
              {formatTime(utterance.start)}
            </span>
          </button>
          <Badge
            variant="outline"
            className="text-xs"
            aria-label={`Betrouwbaarheid ${Math.round(
              utterance.confidence * 100
            )}%`}
          >
            {Math.round(utterance.confidence * 100)}%
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyUtterance}
            className="ml-auto h-6 px-1"
            title="Kopieer utterance"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </TranscriptionMessageContent>
    </TranscriptionMessage>
  );
}

