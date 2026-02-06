import { CalendarViewComponent } from "@/features/meetings/components/calendar-view";
import { GoogleConnectionPrompt } from "@/features/meetings/components/google-connection-prompt";
import { getMonthRange } from "@/features/meetings/lib/calendar-utils";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedBotSessionsByCalendarEventIds } from "@/server/cache/bot-sessions.cache";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { getCachedCalendarMeetings } from "@/server/cache/calendar-meetings.cache";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { parse, startOfMonth } from "date-fns";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function MeetingsContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    redirect("/sign-in");
  }

  // Check Google Calendar connection status
  const connectionStatusResult = await GoogleOAuthService.getConnectionStatus(
    user.id
  );

  if (connectionStatusResult.isErr()) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium mb-2">
            Failed to check Google Calendar connection
          </p>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page. If the problem persists, check your
            connection and try again.
          </p>
        </div>
      </div>
    );
  }

  if (!connectionStatusResult.value.connected) {
    return <GoogleConnectionPrompt />;
  }

  // Get bot settings and parse month in parallel
  const [{ month: monthParam }, settingsResult] = await Promise.all([
    searchParams,
    getCachedBotSettings(user.id, organization.id),
  ]);

  if (settingsResult.isErr()) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load bot settings. Please try again.
          </p>
        </div>
      </div>
    );
  }

  // Parse month from URL or use current month
  const currentMonth = monthParam
    ? startOfMonth(parse(monthParam, "yyyy-MM", new Date()))
    : startOfMonth(new Date());

  const { start: timeMin, end: timeMax } = getMonthRange(currentMonth);

  // Fetch meetings first, then bot sessions
  const meetings = await getCachedCalendarMeetings(
    user.id,
    organization.id,
    timeMin,
    timeMax,
    settingsResult.value.calendarIds
  );

  const calendarEventIds = meetings.map((m) => m.id);
  const botSessions =
    calendarEventIds.length > 0
      ? await getCachedBotSessionsByCalendarEventIds(
          calendarEventIds,
          organization.id
        )
      : new Map();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Meetings</h1>
          <p className="text-muted-foreground mt-2">
            View your Google Calendar meetings and bot session status
          </p>
        </div>

        <CalendarViewComponent
          initialDate={currentMonth}
          meetings={meetings}
          botSessions={botSessions}
        />
      </div>
    </div>
  );
}

export default function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          className="container mx-auto py-8 px-4"
          aria-busy="true"
          aria-label="Loading meetings"
          role="status"
        >
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-6 space-y-2">
              <div
                className="h-9 w-48 bg-muted rounded animate-pulse"
                aria-hidden="true"
              />
              <div
                className="h-5 w-96 bg-muted rounded animate-pulse"
                aria-hidden="true"
              />
            </div>
            <div className="h-[600px] bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      }
    >
      <MeetingsContent searchParams={searchParams} />
    </Suspense>
  );
}

