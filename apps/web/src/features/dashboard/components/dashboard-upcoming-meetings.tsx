"use client";

import { Button } from "@/components/ui/button";
import { AddBotButton } from "@/features/meetings/components/add-bot-button";
import type { MeetingWithSession } from "@/features/meetings/lib/calendar-utils";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import {
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface DashboardUpcomingMeetingsProps {
  meetings: CalendarEvent[];
  botSessionsMap: Record<string, BotSession>;
  now: number;
}

function formatRelativeTime(
  date: Date,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 0) return t("started");
  if (diffMin === 0) return t("now");
  if (diffMin < 60) return t("inMinutes", { count: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  const remainMin = diffMin % 60;
  if (remainMin === 0) return t("inHours", { count: diffHours });
  return t("inHoursMinutes", { hours: diffHours, minutes: remainMin });
}

function formatDuration(
  start: Date,
  end: Date,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
): string {
  const diffMin = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (diffMin < 60) return t("durationMinutes", { count: diffMin });
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return t("durationHours", { count: hours });
  return t("durationHoursMinutes", { hours, minutes: mins });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isHappeningSoon(date: Date): boolean {
  const diffMs = date.getTime() - new Date().getTime();
  return diffMs >= 0 && diffMs <= 15 * 60_000;
}

function MeetingCard({
  meeting,
  botSession,
  isNext,
  t,
}: {
  meeting: CalendarEvent;
  botSession?: BotSession;
  isNext: boolean;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
}) {
  const router = useRouter();
  const attendeeCount = meeting.attendees?.length ?? 0;
  const startDate = new Date(meeting.start);
  const endDate = new Date(meeting.end);
  const soon = isHappeningSoon(startDate);
  const meetingWithSession: MeetingWithSession = {
    ...meeting,
    botSession,
  };

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all ${
        isNext
          ? "border-primary/30 bg-primary/[0.03] shadow-sm"
          : "bg-card hover:bg-accent/5"
      }`}
    >
      {soon && (
        <span className="absolute -top-2 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          {t("startingSoon")}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`truncate font-medium ${isNext ? "text-base" : "text-sm"}`}
          >
            {meeting.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {formatTime(startDate)} &middot;{" "}
              {formatDuration(startDate, endDate, t)}
            </span>
            <span className="font-medium text-foreground/70">
              {formatRelativeTime(startDate, t)}
            </span>
            {attendeeCount > 0 && (
              <span className="flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {attendeeCount}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!botSession && (
            <AddBotButton
              meeting={meetingWithSession}
              variant="icon"
              onSuccess={() => router.refresh()}
            />
          )}
          {meeting.meetingUrl && (
            <Button
              size={isNext ? "default" : "sm"}
              variant={isNext ? "default" : "outline"}
              className="shrink-0"
              render={
                <a
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t("join")} ${meeting.title}`}
                />
              }
              nativeButton={false}
            >
              {isNext ? (
                <>
                  <VideoIcon className="mr-1.5 h-4 w-4" />
                  {t("joinMeeting")}
                </>
              ) : (
                <>
                  {t("join")}
                  <ExternalLinkIcon className="ml-1 h-3 w-3" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useTranslations("dashboard");

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{t("noUpcomingMeetings")}</p>
        <p className="text-xs text-muted-foreground">
          {t.rich("connectCalendar", {
            settingsLink: (chunks) => (
              <Link
                href="/settings"
                className="text-primary underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}

export function DashboardUpcomingMeetings({
  meetings,
  botSessionsMap,
  now,
}: DashboardUpcomingMeetingsProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");

  const sorted = [...meetings]
    .filter((m) => new Date(m.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 3);

  return (
    <section aria-label={t("upcomingMeetingsAriaLabel")}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("todaysMeetings")}
        </h2>
        {sorted.length > 0 && (
          <Link
            href="/meetings"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {tCommon("viewAll")}
          </Link>
        )}
      </div>
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {sorted.map((meeting, i) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              botSession={botSessionsMap[meeting.id]}
              isNext={i === 0}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  );
}
