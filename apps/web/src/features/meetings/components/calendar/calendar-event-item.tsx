"use client";

import { FileVideoIcon } from "lucide-react";
import { BotSessionStatusTrigger } from "@/features/bot/components/bot-session-status-trigger";
import { AddBotButton } from "@/features/meetings/components/add-bot-button";
import { formatTimeRange } from "@/features/meetings/lib/calendar-utils";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CalendarEventItemProps {
  meeting: MeetingWithSession;
  compact?: boolean;
  onMeetingClick?: (meeting: MeetingWithSession) => void;
}

export function CalendarEventItem({
  meeting,
  compact = false,
  onMeetingClick,
}: CalendarEventItemProps) {
  const timeDisplay = formatTimeRange(meeting.start, meeting.end);
  const hasBotSession = !!meeting.botSession;
  const botSession = meeting.botSession;
  const isPast = meeting.end <= new Date();
  const hasRecording = !!(
    botSession?.recordingId && botSession?.projectId
  );
  const NoBotFallback = (
    <span className="text-xs text-muted-foreground">No bot</span>
  );

  const content = (
    <>
      <div className="flex items-center gap-1.5 truncate">
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
        <span className="truncate font-medium">{meeting.title}</span>
      </div>
      <div className="mt-0.5 flex min-h-[28px] items-center gap-1.5">
        <span className="text-muted-foreground">{timeDisplay}</span>
        {hasBotSession && botSession ? (
          <>
            <div onClick={(e) => e.stopPropagation()}>
              <BotSessionStatusTrigger
                status={botSession.botStatus}
                sessionId={botSession.id}
                error={botSession.error}
                className="scale-75"
              />
            </div>
            {hasRecording && (
              <Link
                href={`/projects/${botSession.projectId}/recordings/${botSession.recordingId}`}
                className="inline-flex items-center rounded p-0.5 text-primary transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="View recording"
                title="View recording"
                onClick={(e) => e.stopPropagation()}
              >
                <FileVideoIcon className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        ) : isPast ? (
          NoBotFallback
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <AddBotButton meeting={meeting} variant="icon" />
          </div>
        )}
      </div>
    </>
  );

  if (compact) {
    const wrapperClassName = cn(
      "group w-full rounded-md p-1.5 text-xs transition-colors",
      "hover:bg-accent",
      hasBotSession && "bg-primary/5",
      onMeetingClick && "cursor-pointer"
    );
    return (
      <div
        {...(onMeetingClick && { role: "button" })}
        aria-label={`${meeting.title} - ${timeDisplay}`}
        className={wrapperClassName}
        title={`${meeting.title} - ${timeDisplay}`}
        onClick={
          onMeetingClick
            ? (e) => {
                e.stopPropagation();
                onMeetingClick(meeting);
              }
            : undefined
        }
        onKeyDown={
          onMeetingClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onMeetingClick(meeting);
                }
              }
            : undefined
        }
        tabIndex={onMeetingClick ? 0 : undefined}
      >
        {content}
      </div>
    );
  }

  const nonCompactContent = (
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{meeting.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {timeDisplay}
        </div>
        {meeting.attendees && meeting.attendees.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {meeting.attendees.length} attendee
            {meeting.attendees.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
      <div
        className="flex min-h-[44px] flex-col items-end justify-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {hasBotSession && botSession ? (
          <>
            <BotSessionStatusTrigger
              status={botSession.botStatus}
              sessionId={botSession.id}
              error={botSession.error}
            />
            {hasRecording && (
              <Link
                href={`/projects/${botSession.projectId}/recordings/${botSession.recordingId}`}
                className="inline-flex items-center gap-1 text-xs text-primary transition-colors hover:underline"
                aria-label="View recording"
              >
                <FileVideoIcon className="h-3.5 w-3.5" />
                <span>View Recording</span>
              </Link>
            )}
          </>
        ) : isPast ? (
          NoBotFallback
        ) : (
          <AddBotButton meeting={meeting} variant="icon" />
        )}
      </div>
    </div>
  );

  const wrapperClassName = cn(
    "group w-full rounded-lg border p-2 text-sm transition-colors",
    "hover:bg-accent",
    hasBotSession && "border-primary/20 bg-primary/5",
    onMeetingClick && "cursor-pointer"
  );

  return (
    <div
      role={onMeetingClick ? "button" : "group"}
      aria-label={`${meeting.title} - ${timeDisplay}`}
      className={wrapperClassName}
      onClick={
        onMeetingClick
          ? (e) => {
              e.stopPropagation();
              onMeetingClick(meeting);
            }
          : undefined
      }
      onKeyDown={
        onMeetingClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onMeetingClick(meeting);
              }
            }
          : undefined
      }
      tabIndex={onMeetingClick ? 0 : undefined}
    >
      {nonCompactContent}
    </div>
  );
}
