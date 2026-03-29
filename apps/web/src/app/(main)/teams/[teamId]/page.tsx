import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamDashboard } from "@/features/teams/components/team-dashboard";

export async function generateMetadata({
  params,
}: TeamPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const authResult = await getBetterAuthSession();
  if (authResult.isOk() && authResult.value.organization) {
    const team = await TeamQueries.selectTeamById(
      teamId,
      authResult.value.organization.id,
    );
    if (team) {
      return { title: team.name };
    }
  }
  return { title: "Team" };
}
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { requirePermission } from "@/lib/permissions/require-permission";
import { canAccessTeam } from "@/lib/permissions/presets";
import { TeamQueries } from "@/server/data-access/teams.queries";
import { Suspense } from "react";

interface TeamPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function TeamDashboardContainer({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  await requirePermission(canAccessTeam, { teamId });

  return <TeamDashboard teamId={teamId} />;
}

export default async function TeamPage({ params }: TeamPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-32" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i: number) => (
                <Skeleton key={`skeleton-${i}`} className="h-32" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <TeamDashboardContainer params={params} />
        </div>
      </div>
    </Suspense>
  );
}
