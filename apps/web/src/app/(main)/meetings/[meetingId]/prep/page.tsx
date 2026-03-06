import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
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

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    redirect("/sign-in");
  }

  const meeting = await MeetingsQueries.findById(meetingId, organization.id);
  if (!meeting) return notFound();

  const [agendaItems, notes, postActions, templates] = await Promise.all([
    MeetingAgendaItemsQueries.findByMeetingId(meetingId),
    MeetingNotesQueries.findByMeetingId(meetingId),
    MeetingPostActionsQueries.findByMeetingId(meetingId),
    MeetingAgendaTemplatesQueries.findAvailable(organization.id),
  ]);

  const preNotes = notes.find((n) => n.type === "pre_meeting") ?? null;

  return (
    <MeetingPrepContent
      meeting={meeting}
      agendaItems={agendaItems}
      preNotes={preNotes}
      postActions={postActions}
      templates={templates}
    />
  );
}

export default async function MeetingPrepPage(props: PageProps) {
  const params = await props.params;

  return (
    <div className="container max-w-4xl py-8 px-4">
      <Suspense
        fallback={
          <div
            className="animate-pulse space-y-4"
            aria-busy="true"
            aria-label="Loading meeting prep"
            role="status"
          >
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
          </div>
        }
      >
        <MeetingPrepLoader meetingId={params.meetingId} />
      </Suspense>
    </div>
  );
}
