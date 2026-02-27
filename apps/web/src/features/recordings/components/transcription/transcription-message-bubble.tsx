"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOrganizationMembers } from "@/features/tasks/hooks/use-organization-members";
import { Copy, UserCog } from "lucide-react";
import type { HTMLAttributes } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { TranscriptionMessageBubbleProps } from "./types";
import { ChangeUtteranceSpeakerDialog } from "./change-utterance-speaker-dialog";
import {
  formatTimestampRange,
  formatCopyText,
  getUtteranceCountLabel,
} from "./utterance-helpers";
import { getSpeakerInfo, getUserInitials } from "./speaker-helpers";
import { useJumpToTimestamp } from "@/features/recordings/hooks/use-jump-to-timestamp";
import {
  getSpeakerMessageColor,
  getSpeakerBgColor,
  getSpeakerAvatarColor,
} from "@/features/recordings/lib/speaker-colors";

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
  return {
    text: getSpeakerMessageColor(speakerIndex),
    bg: getSpeakerBgColor(speakerIndex),
    avatar: getSpeakerAvatarColor(speakerIndex),
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
      "group flex w-full items-end py-2 gap-2 transition-opacity duration-200",
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
  groupedUtterance,
  viewMode,
  speakersDetected,
  speakerNames,
  speakerUserIds,
  recordingId,
}: TranscriptionMessageBubbleProps) {
  const speakerColor = getSpeakerColor(groupedUtterance.speaker);
  const isLeftAligned =
    groupedUtterance.speaker % 2 === 0 && viewMode === "detailed";
  const { members: users = [] } = useOrganizationMembers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Get speaker display info (React 19 handles optimization automatically)
  const speakerInfo = getSpeakerInfo(
    groupedUtterance.speaker,
    speakerNames,
    speakerUserIds,
    users
  );

  const userInitials = getUserInitials(speakerInfo, groupedUtterance.speaker);
  const timestampRange = formatTimestampRange(groupedUtterance);
  const utteranceCountLabel = getUtteranceCountLabel(
    groupedUtterance.utterances.length
  );
  const hasMultipleUtterances = groupedUtterance.utterances.length > 1;

  const jumpToTimestamp = useJumpToTimestamp();

  const handleJumpToTimestamp = () => {
    jumpToTimestamp(groupedUtterance.start);
  };

  const handleCopyUtterance = async () => {
    const text = formatCopyText(groupedUtterance, speakerInfo.name);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Utterance gekopieerd naar klembord");
    } catch (error) {
      console.error("Failed to copy utterance:", error);
      toast.error("Fout bij kopiëren naar klembord");
    }
  };

  const handleSpeakerChangeSuccess = () => {
    // The page will automatically refresh via revalidatePath in the server action
  };

  return (
    <TranscriptionMessage isLeftAligned={isLeftAligned} data-speaker={groupedUtterance.speaker}>
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
            {hasMultipleUtterances && (
              <Badge
                variant="outline"
                className="text-xs"
                aria-label={`${utteranceCountLabel} gecombineerd`}
              >
                {utteranceCountLabel}
              </Badge>
            )}
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">
          {groupedUtterance.text}
        </p>

        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={handleJumpToTimestamp}
            className="hover:underline cursor-pointer"
            title="Ga naar dit moment in de opname"
            aria-label={
              hasMultipleUtterances
                ? `Ga naar tijdsbereik ${timestampRange}`
                : `Ga naar starttijd ${timestampRange}`
            }
          >
            <span
              aria-label={
                hasMultipleUtterances
                  ? `Tijdsbereik ${timestampRange}`
                  : `Starttijd ${timestampRange}`
              }
            >
              {timestampRange}
            </span>
          </button>
          <Badge
            variant="outline"
            className="text-xs"
            aria-label={`Betrouwbaarheid ${Math.round(
              groupedUtterance.confidence * 100
            )}%`}
          >
            {Math.round(groupedUtterance.confidence * 100)}%
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyUtterance}
            className="h-6 px-1"
            title="Kopieer utterance"
            aria-label="Kopieer utterance"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="ml-auto h-6 px-1"
            title="Wijzig spreker"
            aria-label="Wijzig spreker voor deze zin"
          >
            <UserCog className="h-3 w-3" />
          </Button>
        </div>
      </TranscriptionMessageContent>
      <ChangeUtteranceSpeakerDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        recordingId={recordingId}
        utteranceIndex={groupedUtterance.startIndices[0]}
        currentSpeaker={groupedUtterance.speaker}
        speakersDetected={speakersDetected}
        speakerNames={speakerNames}
        speakerUserIds={speakerUserIds}
        onSuccess={handleSpeakerChangeSuccess}
      />
    </TranscriptionMessage>
  );
}

