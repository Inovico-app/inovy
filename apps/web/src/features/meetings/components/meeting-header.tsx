"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Users } from "lucide-react";
import { format } from "date-fns";
import type { Meeting } from "@/server/db/schema/meetings";
import type { MeetingParticipant } from "@/server/db/schema/meetings";
import {
  meetingStatusColors,
  formatStatusLabel,
} from "../lib/meeting-constants";

interface MeetingHeaderProps {
  meeting: Meeting;
  showActualTime?: boolean;
}

export function MeetingHeader({
  meeting,
  showActualTime = false,
}: MeetingHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const participants = (meeting.participants as MeetingParticipant[]) ?? [];

  // Restore calendar state when navigating back
  const returnTo = searchParams.get("returnTo");
  const backUrl = returnTo ? `/meetings${returnTo}` : "/meetings";

  const startTime = showActualTime
    ? meeting.actualStartAt
    : meeting.scheduledStartAt;
  const endTime = showActualTime ? meeting.actualEndAt : meeting.scheduledEndAt;

  return (
    <header className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(backUrl as never)}
        className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
      >
        <ArrowLeft className="h-4 w-4" />
        Meetings
      </Button>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <h1 className="text-2xl font-bold tracking-tight leading-tight">
            {meeting.title}
          </h1>
          <Badge
            variant="secondary"
            className={`mt-1 shrink-0 ${meetingStatusColors[meeting.status]}`}
          >
            {formatStatusLabel(meeting.status)}
          </Badge>
        </div>

        {meeting.description && (
          <p className="text-muted-foreground leading-relaxed">
            {meeting.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
          {meeting.scheduledStartAt && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(meeting.scheduledStartAt), "EEE, MMM d")}
            </span>
          )}
          {startTime && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(startTime), "HH:mm")}
              {endTime && ` – ${format(new Date(endTime), "HH:mm")}`}
            </span>
          )}
          {participants.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {participants.length} participant
              {participants.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-border" />
    </header>
  );
}
