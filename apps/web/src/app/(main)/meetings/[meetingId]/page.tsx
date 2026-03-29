import type { Metadata } from "next";
import { MeetingDetailContent } from "@/features/meetings/components/meeting-detail-content";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { assertTeamAccess } from "@/lib/rbac/team-isolation";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { meetingId } = await params;
  const authResult = await getBetterAuthSession();
  if (authResult.isOk() && authResult.value.organization) {
    const meeting = await MeetingsQueries.findById(
      meetingId,
      authResult.value.organization.id,
    );
    if (meeting) {
      return { title: meeting.title };
    }
  }
  return { title: "Meeting" };
}
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingNotesQueries } from "@/server/data-access/meeting-notes.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ meetingId: string }>;
}

async function MeetingDetailLoader({ meetingId }: { meetingId: string }) {
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
    assertTeamAccess(meeting.teamId, userTeamIds, user, "MeetingDetailPage");
  } catch {
    return notFound();
  }

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
  const t = await getTranslations("meetings");

  return (
    <div className="mx-auto w-full max-w-3xl py-10 px-4 sm:px-6">
      <Suspense
        fallback={
          <div
            className="animate-pulse space-y-4"
            aria-busy="true"
            aria-label={t("page.loadingDetails")}
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
