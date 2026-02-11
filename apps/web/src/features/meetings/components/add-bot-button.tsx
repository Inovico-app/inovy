"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { AddBotConsentDialog } from "./add-bot-consent-dialog";
import { useAddBotToMeeting } from "../hooks/use-add-bot-to-meeting";

interface AddBotButtonProps {
  meeting: MeetingWithSession;
  variant?: "button" | "icon";
}

/**
 * Add Bot button for meetings without bot sessions
 * Handles consent flow and optimistic UI updates
 */
export function AddBotButton({ meeting, variant = "button" }: AddBotButtonProps) {
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [pendingMeeting, setPendingMeeting] = useState<MeetingWithSession | null>(
    null
  );

  const { execute, isExecuting } = useAddBotToMeeting({
    onConsentRequired: () => {
      setPendingMeeting(meeting);
      setIsConsentDialogOpen(true);
    },
  });

  const handleAddBot = () => {
    execute({
      calendarEventId: meeting.id,
      meetingUrl: meeting.meetingUrl,
      meetingTitle: meeting.title,
      consentGiven: false,
    });
  };

  const handleConsentAccept = () => {
    if (!pendingMeeting) return;

    execute({
      calendarEventId: pendingMeeting.id,
      meetingUrl: pendingMeeting.meetingUrl,
      meetingTitle: pendingMeeting.title,
      consentGiven: true,
    });
    setPendingMeeting(null);
  };

  const isUpcoming = meeting.end > new Date();
  const hasMeetingUrl =
    meeting.meetingUrl?.trim() && meeting.meetingUrl.includes("meet.google.com");

  if (!isUpcoming || !hasMeetingUrl) {
    return null;
  }

  if (variant === "icon") {
    return (
      <TooltipProvider>
        <AddBotConsentDialog
          open={isConsentDialogOpen}
          onOpenChange={(open) => {
            setIsConsentDialogOpen(open);
            if (!open) setPendingMeeting(null);
          }}
          onAccept={handleConsentAccept}
          meetingTitle={pendingMeeting?.title ?? meeting.title}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                handleAddBot();
              }}
              disabled={isExecuting}
              aria-label="Add bot to meeting"
            >
              {isExecuting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add bot to meeting</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      <AddBotConsentDialog
        open={isConsentDialogOpen}
        onOpenChange={(open) => {
          setIsConsentDialogOpen(open);
          if (!open) setPendingMeeting(null);
        }}
        onAccept={handleConsentAccept}
        meetingTitle={pendingMeeting?.title ?? meeting.title}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddBot}
        disabled={isExecuting}
      >
        {isExecuting ? (
          <>
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          "Add Bot"
        )}
      </Button>
    </>
  );
}
