import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingDetailContent } from "@/features/meetings/components/meeting-detail-content";

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

async function MeetingDetailLoader({ meetingId }: { meetingId: string }) {
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

  const [agendaItems, notes, postActions] = await Promise.all([
    MeetingAgendaItemsQueries.findByMeetingId(meetingId),
    MeetingNotesQueries.findByMeetingId(meetingId),
    MeetingPostActionsQueries.findByMeetingId(meetingId),
  ]);

  return (
    <MeetingDetailContent
      meeting={meeting}
      agendaItems={agendaItems}
      notes={notes}
      postActions={postActions}
    />
  );
}

export default async function MeetingDetailPage(props: PageProps) {
  const params = await props.params;

  return (
    <div className="container max-w-4xl py-8 px-4">
      <Suspense
        fallback={
          <div
            className="animate-pulse space-y-4"
            aria-busy="true"
            aria-label="Loading meeting details"
            role="status"
          >
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        }
      >
        <MeetingDetailLoader meetingId={params.meetingId} />
      </Suspense>
    </div>
  );
}
