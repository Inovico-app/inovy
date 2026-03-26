import { Button } from "@/components/ui/button";
import { BotMessageSquareIcon, MicIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface DashboardGreetingProps {
  userName: string;
  pendingTaskCount: number;
  upcomingMeetingCount: number;
}

function getTimeGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

export async function DashboardGreeting({
  userName,
  pendingTaskCount,
  upcomingMeetingCount,
}: DashboardGreetingProps) {
  const t = await getTranslations("dashboard");

  function buildSubtitle(): string {
    const hasTasks = pendingTaskCount > 0;
    const hasMeetings = upcomingMeetingCount > 0;

    if (!hasTasks && !hasMeetings) {
      return t("subtitleNone");
    }

    const tasksPart = hasTasks
      ? t("subtitleTasks", { count: pendingTaskCount })
      : "";
    const meetingsPart = hasMeetings
      ? t("subtitleMeetings", { count: upcomingMeetingCount })
      : "";

    if (hasTasks && hasMeetings) {
      return t("subtitleBoth", { tasks: tasksPart, meetings: meetingsPart });
    }

    return t("subtitleSingle", { items: tasksPart || meetingsPart });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t(getTimeGreetingKey())}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground">{buildSubtitle()}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="secondary"
          render={<Link href="/chat" />}
          nativeButton={false}
        >
          <BotMessageSquareIcon className="mr-1.5 h-3.5 w-3.5" />
          {t("askAi")}
        </Button>
        <Button
          size="default"
          render={<Link href="/record" />}
          nativeButton={false}
        >
          <MicIcon className="mr-1.5 h-4 w-4" />
          {t("newRecording")}
        </Button>
      </div>
    </div>
  );
}
