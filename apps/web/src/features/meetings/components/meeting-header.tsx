"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users } from "lucide-react";
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
  const participants = (meeting.participants as MeetingParticipant[]) ?? [];

  const startTime = showActualTime
    ? meeting.actualStartAt
    : meeting.scheduledStartAt;
  const endTime = showActualTime
    ? meeting.actualEndAt
    : meeting.scheduledEndAt;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold">{meeting.title}</h1>
        <Badge
          variant="secondary"
          className={meetingStatusColors[meeting.status]}
        >
          {formatStatusLabel(meeting.status)}
        </Badge>
      </div>
      {meeting.description && (
        <p className="text-muted-foreground mb-3">{meeting.description}</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {meeting.scheduledStartAt && (
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>
              {new Date(meeting.scheduledStartAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
        {startTime && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>
              {new Date(startTime).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
              {endTime &&
                ` – ${new Date(endTime).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </span>
          </div>
        )}
        {participants.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>
              {participants.length} participant
              {participants.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
