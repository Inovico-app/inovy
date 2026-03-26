"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { UpcomingMeeting } from "../hooks/use-upcoming-meetings";

interface UpcomingMeetingsListProps {
  meetings: UpcomingMeeting[];
  isLoading: boolean;
  onToggleRecording: (meetingId: string) => void;
  onToggleAll: (enabled: boolean) => void;
}

function formatTime(isoString: string, locale: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingMeetingsList({
  meetings,
  isLoading,
  onToggleRecording,
  onToggleAll,
}: UpcomingMeetingsListProps): React.ReactNode {
  const t = useTranslations("onboarding");
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t("stepCalendarLoadingMeetings")}
        </span>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {t("stepCalendarNoUpcoming")}
      </p>
    );
  }

  const allEnabled = meetings.every((m) => m.recordingEnabled);
  const noneEnabled = meetings.every((m) => !m.recordingEnabled);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t("stepCalendarUpcomingTitle")}
        </h3>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("text-xs", allEnabled && "text-primary")}
            onClick={() => onToggleAll(true)}
          >
            {t("stepCalendarMeetingRecordAll")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("text-xs", noneEnabled && "text-primary")}
            onClick={() => onToggleAll(false)}
          >
            {t("stepCalendarMeetingRecordNone")}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("stepCalendarUpcomingSubtitle")}
      </p>

      <ul className="space-y-2" role="list">
        {meetings.map((meeting) => (
          <li
            key={meeting.id}
            className="flex items-center justify-between rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {meeting.title || t("stepCalendarMeetingNoTitle")}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {meeting.isToday
                      ? t("stepCalendarMeetingToday")
                      : t("stepCalendarMeetingTomorrow")}
                  </Badge>
                  <span>
                    {formatTime(meeting.startTime, locale)} -{" "}
                    {formatTime(meeting.endTime, locale)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className="text-xs text-muted-foreground">
                {t("stepCalendarMeetingRecord")}
              </span>
              <Switch
                checked={meeting.recordingEnabled}
                onCheckedChange={() => onToggleRecording(meeting.id)}
                size="sm"
                aria-label={`${t("stepCalendarMeetingRecord")} ${meeting.title}`}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
