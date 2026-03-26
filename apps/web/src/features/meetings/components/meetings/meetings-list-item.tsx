"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BotSessionStatusTrigger } from "@/features/bot/components/bot-session-status-trigger";
import { AddBotButton } from "@/features/meetings/components/add-bot-button";
import { SeriesSubscriptionToggle } from "@/features/meetings/components/series-subscription-toggle";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import {
  formatAttendeesCount,
  formatMeetingDuration,
  formatTimeRange,
  getMeetingBotStatus,
} from "@/features/meetings/lib/calendar-utils";
import type { BotSeriesSubscription } from "@/server/db/schema/bot-series-subscriptions";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import {
  CalendarIcon,
  ClockIcon,
  FileVideoIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

interface MeetingsListItemProps {
  meeting: MeetingWithSession;
  onMeetingClick?: (meeting: MeetingWithSession) => void;
  subscriptions?: BotSeriesSubscription[];
  onSubscriptionChange?: () => void;
}

export function MeetingsListItem({
  meeting,
  onMeetingClick,
  subscriptions,
  onSubscriptionChange,
}: MeetingsListItemProps) {
  const t = useTranslations("meetings");
  const botStatus = getMeetingBotStatus(meeting, meeting.botSession);
  const isPast = meeting.end < new Date();
  const isUpcoming = meeting.start > new Date();
  const botSession = meeting.botSession;
  const hasRecording = !!(botSession?.recordingId && botSession?.projectId);

  const titleDateContent = (
    <>
      {/* Title */}
      <div className="flex items-start gap-2">
        <h3 className="font-semibold text-base leading-tight">
          {meeting.title || t("list.untitledMeeting")}
        </h3>
        {meeting.isOrganizer === false && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<Badge variant="secondary" className="shrink-0" />}
              >
                {t("list.invited")}
              </TooltipTrigger>
              <TooltipContent>{t("list.invitedTooltip")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Date and Time */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="h-4 w-4" />
          <span>
            {format(meeting.start, "MMM d, yyyy")}
            {isUpcoming && (
              <span className="ml-1">
                ({formatDistanceToNow(meeting.start, { addSuffix: true })})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ClockIcon className="h-4 w-4" />
          <span>
            {formatTimeRange(meeting.start, meeting.end)} •{" "}
            {formatMeetingDuration(meeting.start, meeting.end)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <UsersIcon className="h-4 w-4" />
          <span>{formatAttendeesCount(meeting)}</span>
        </div>
      </div>
    </>
  );

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        isPast && "opacity-75",
        onMeetingClick && "cursor-pointer",
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {onMeetingClick ? (
            <button
              type="button"
              className="flex-1 space-y-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              aria-label={t("list.viewDetailsAriaLabel", {
                title: meeting.title || t("list.untitledMeeting"),
              })}
              onClick={() => onMeetingClick(meeting)}
            >
              {titleDateContent}
            </button>
          ) : (
            <div className="flex-1 space-y-2">{titleDateContent}</div>
          )}

          {/* Bot Status Badge or Add Bot */}
          <div
            role="group"
            aria-label={t("list.meetingActionsAriaLabel")}
            className="flex min-h-[44px] items-center gap-2 sm:items-center"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {botStatus === "no_bot" ||
            ((botStatus === "removed" || botStatus === "failed") &&
              isUpcoming) ? (
              isUpcoming ? (
                <AddBotButton meeting={meeting} variant="button" />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("list.noNotetaker")}
                </span>
              )
            ) : (
              <>
                <BotSessionStatusTrigger
                  status={botStatus}
                  sessionId={botSession?.id}
                  error={botSession?.error}
                />
                {hasRecording && (
                  <Link
                    href={`/projects/${botSession!.projectId}/recordings/${botSession!.recordingId}`}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    aria-label={t("list.viewRecordingAriaLabel")}
                  >
                    <FileVideoIcon className="h-4 w-4" />
                    <span>{t("list.viewRecording")}</span>
                  </Link>
                )}
              </>
            )}
            {/* Series subscription toggle — only for recurring meetings */}
            {meeting.recurringSeriesId &&
              meeting.calendarProvider &&
              subscriptions !== undefined && (
                <SeriesSubscriptionToggle
                  calendarEventId={meeting.id}
                  calendarId={meeting.calendarId}
                  calendarProvider={meeting.calendarProvider}
                  recurringSeriesId={meeting.recurringSeriesId}
                  subscriptions={subscriptions}
                  onSubscriptionChange={onSubscriptionChange}
                />
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
