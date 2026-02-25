import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/server/services/google-calendar.service";
import {
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";

interface DashboardUpcomingMeetingsProps {
  meetings: CalendarEvent[];
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 0) return "Started";
  if (diffMin === 0) return "Now";
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  const remainMin = diffMin % 60;
  if (remainMin === 0) return `in ${diffHours}h`;
  return `in ${diffHours}h ${remainMin}m`;
}

function formatDuration(start: Date, end: Date): string {
  const diffMin = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (diffMin < 60) return `${diffMin}min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
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
  isNext,
}: {
  meeting: CalendarEvent;
  isNext: boolean;
}) {
  const attendeeCount = meeting.attendees?.length ?? 0;
  const startDate = new Date(meeting.start);
  const endDate = new Date(meeting.end);
  const soon = isHappeningSoon(startDate);

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
          Starting soon
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
              {formatDuration(startDate, endDate)}
            </span>
            <span className="font-medium text-foreground/70">
              {formatRelativeTime(startDate)}
            </span>
            {attendeeCount > 0 && (
              <span className="flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {attendeeCount}
              </span>
            )}
          </div>
        </div>
        {meeting.meetingUrl && (
          <Button
            size={isNext ? "default" : "sm"}
            variant={isNext ? "default" : "outline"}
            className="shrink-0"
            asChild
          >
            <a
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Join ${meeting.title}`}
            >
              {isNext ? (
                <>
                  <VideoIcon className="mr-1.5 h-4 w-4" />
                  Join Meeting
                </>
              ) : (
                <>
                  Join
                  <ExternalLinkIcon className="ml-1 h-3 w-3" />
                </>
              )}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <CalendarIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No upcoming meetings today</p>
        <p className="text-xs text-muted-foreground">
          Connect Google Calendar in{" "}
          <Link
            href="/settings"
            className="text-primary underline underline-offset-2"
          >
            Settings
          </Link>{" "}
          to see your schedule.
        </p>
      </div>
    </div>
  );
}

export function DashboardUpcomingMeetings({
  meetings,
}: DashboardUpcomingMeetingsProps) {
  const now = Date.now();
  const sorted = [...meetings]
    .filter((m) => new Date(m.end).getTime() >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 3);

  return (
    <section aria-label="Upcoming meetings">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          Today&apos;s Meetings
        </h2>
        {sorted.length > 0 && (
          <Link
            href="/meetings"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        )}
      </div>
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {sorted.map((meeting, i) => (
            <MeetingCard key={meeting.id} meeting={meeting} isNext={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

