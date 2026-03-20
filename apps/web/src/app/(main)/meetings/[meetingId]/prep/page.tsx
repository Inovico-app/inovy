import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { meetingId } = await params;
  return { title: `Meeting Prep ${meetingId}` };
}
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { assertTeamAccess } from "@/lib/rbac/team-isolation";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { MeetingAgendaTemplatesQueries } from "@/server/data-access/meeting-agenda-templates.queries";
import { MeetingPrepContent } from "@/features/meetings/components/meeting-prep-content";

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

async function MeetingPrepLoader({ meetingId }: { meetingId: string }) {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/sign-in");
  }

  const { user, organization, userTeamIds } = authResult.value;

  if (!user || !organization) {
    redirect("/sign-in");
  }

  const meeting = await MeetingsQueries.findById(meetingId, organization.id);
  if (!meeting) return notFound();

  // Enforce team-level access isolation
  try {
    assertTeamAccess(meeting.teamId, userTeamIds, user, "MeetingPrepPage");
  } catch {
    return notFound();
  }

  const [agendaItems, notes, templates] = await Promise.all([
    MeetingAgendaItemsQueries.findByMeetingId(meetingId),
    MeetingNotesQueries.findByMeetingId(meetingId),
    MeetingAgendaTemplatesQueries.findAvailable(organization.id),
  ]);

  const preNotes = notes.find((n) => n.type === "pre_meeting") ?? null;

  return (
    <MeetingPrepContent
      meeting={meeting}
      agendaItems={agendaItems}
      preNotes={preNotes}
      templates={templates}
    />
  );
}

export default async function MeetingPrepPage(props: PageProps) {
  const params = await props.params;

  return (
    <div className="mx-auto w-full max-w-3xl py-10 px-4 sm:px-6">
      <Suspense
        fallback={
          <div
            className="animate-pulse space-y-6"
            aria-busy="true"
            aria-label="Loading meeting prep"
            role="status"
          >
            <div className="space-y-3">
              <div className="h-5 bg-muted rounded-full w-24" />
              <div className="h-9 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </div>
            <div className="h-px bg-border" />
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        }
      >
        <MeetingPrepLoader meetingId={params.meetingId} />
      </Suspense>
    </div>
  );
}
