import { Button } from "@/components/ui/button";
import { BotMessageSquareIcon, MicIcon } from "lucide-react";
import Link from "next/link";

interface DashboardGreetingProps {
  userName: string;
  pendingTaskCount: number;
  upcomingMeetingCount: number;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function buildSubtitle(pendingTasks: number, upcomingMeetings: number): string {
  const parts: string[] = [];

  if (pendingTasks > 0) {
    parts.push(`${pendingTasks} pending task${pendingTasks !== 1 ? "s" : ""}`);
  }
  if (upcomingMeetings > 0) {
    parts.push(
      `${upcomingMeetings} upcoming meeting${upcomingMeetings !== 1 ? "s" : ""}`
    );
  }

  if (parts.length === 0) {
    return "You\u2019re all caught up \u2014 no pending tasks or meetings today.";
  }

  return `You have ${parts.join(" and ")}.`;
}

export function DashboardGreeting({
  userName,
  pendingTaskCount,
  upcomingMeetingCount,
}: DashboardGreetingProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {getTimeGreeting()}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {buildSubtitle(pendingTaskCount, upcomingMeetingCount)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="secondary" asChild>
          <Link href="/chat">
            <BotMessageSquareIcon className="mr-1.5 h-3.5 w-3.5" />
            Ask AI
          </Link>
        </Button>
        <Button size="default" asChild>
          <Link href="/recordings">
            <MicIcon className="mr-1.5 h-4 w-4" />
            New Recording
          </Link>
        </Button>
      </div>
    </div>
  );
}

