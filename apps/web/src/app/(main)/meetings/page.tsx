import { CalendarViewComponent } from "@/features/meetings/components/calendar-view";
import { GoogleConnectionPrompt } from "@/features/meetings/components/google-connection-prompt";
import { getMonthRange } from "@/features/meetings/lib/calendar-utils";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedBotSessionsByCalendarEventIds } from "@/server/cache/bot-sessions.cache";
import { getCachedBotSettings } from "@/server/cache/bot-settings.cache";
import { getCachedCalendarMeetings } from "@/server/cache/calendar-meetings.cache";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function MeetingsContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    redirect("/sign-in");
  }

  // Check Google Calendar connection status first
  const connectionStatusResult = await GoogleOAuthService.getConnectionStatus(
    user.id
  );

  if (
    connectionStatusResult.isErr() ||
    !connectionStatusResult.value.connected
  ) {
    return <GoogleConnectionPrompt />;
  }

  // Get bot settings to retrieve calendarIds
  const settingsResult = await getCachedBotSettings(user.id, organization.id);

  if (settingsResult.isErr()) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Failed to load bot settings. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const settings = settingsResult.value;
  const calendarIds = settings.calendarIds;

  // Calculate month range (current month)
  const now = new Date();
  const { start: timeMin, end: timeMax } = getMonthRange(now);

  // Fetch calendar meetings for the month
  // Cache function returns plain array (unwrapped from Result) for serialization
  const meetings = await getCachedCalendarMeetings(
    user.id,
    organization.id,
    timeMin,
    timeMax,
    calendarIds
  );

  // Fetch matching bot sessions
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
          initialDate={now}
          meetings={meetings}
          botSessions={botSessions}
        />
      </div>
    </div>
  );
}

export default function MeetingsPage() {
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
      <MeetingsContent />
    </Suspense>
  );
}

