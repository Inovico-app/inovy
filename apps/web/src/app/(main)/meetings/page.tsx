import type { Metadata } from "next";
import { CalendarViewComponent } from "@/features/meetings/components/calendar/calendar-view";
import { NotetakerGuidanceBanner } from "@/features/meetings/components/notetaker-guidance-banner";
import { PasteMeetingLink } from "@/features/meetings/components/paste-meeting-link";

export const metadata: Metadata = { title: "Meetings" };
import { CalendarConnectionPrompt } from "@/features/meetings/components/calendar-connection-prompt";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getConnectedProviders } from "@/server/services/calendar/calendar-provider-factory";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function MeetingsContent({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    view?: string;
    page?: string;
    botStatus?: string;
  }>;
}) {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    redirect("/sign-in");
  }

  // Check if any calendar provider (Google or Microsoft) is connected
  const connectedProviders = await getConnectedProviders(user.id);
  const hasCalendarConnection = connectedProviders.length > 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Meetings</h1>
          <p className="text-muted-foreground mt-2">
            View your calendar meetings and manage notetaker assistants
          </p>
        </div>

        <NotetakerGuidanceBanner />

        <div className="mb-6">
          <PasteMeetingLink />
        </div>

        {hasCalendarConnection ? (
          <CalendarViewComponent />
        ) : (
          <CalendarConnectionPrompt />
        )}
      </div>
    </div>
  );
}

export default function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    view?: string;
    page?: string;
    botStatus?: string;
  }>;
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
