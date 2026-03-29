import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMemberManagement } from "@/features/teams/components/team-member-management";

export async function generateMetadata({
  params,
}: TeamMembersPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const authResult = await getBetterAuthSession();
  if (authResult.isOk() && authResult.value.organization) {
    const team = await TeamQueries.selectTeamById(
      teamId,
      authResult.value.organization.id,
    );
    if (team) {
      return { title: `${team.name} Members` };
    }
  }
  return { title: "Team Members" };
}
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { requirePermission } from "@/lib/permissions/require-permission";
import { canManageTeam } from "@/lib/permissions/presets";
import { TeamQueries } from "@/server/data-access/teams.queries";
import { Suspense } from "react";

interface TeamMembersPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function TeamMembersContainer({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  await requirePermission(canManageTeam, { teamId });

  return <TeamMemberManagement teamId={teamId} />;
}

export default async function TeamMembersPage({
  params,
}: TeamMembersPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={`skeleton-${i}`} className="h-20" />
            ))}
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <TeamMembersContainer params={params} />
        </div>
      </div>
    </Suspense>
  );
}
