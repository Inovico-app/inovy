import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamSettings } from "@/features/teams/components/team-settings";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { requirePermission } from "@/lib/permissions/require-permission";
import { canAccessTeam } from "@/lib/permissions/presets";
import { TeamQueries } from "@/server/data-access/teams.queries";
import { Suspense } from "react";

interface TeamSettingsPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export async function generateMetadata({
  params,
}: TeamSettingsPageProps): Promise<Metadata> {
  const { teamId } = await params;
  const authResult = await getBetterAuthSession();
  if (authResult.isOk() && authResult.value.organization) {
    const team = await TeamQueries.selectTeamById(
      teamId,
      authResult.value.organization.id,
    );
    if (team) {
      return { title: `${team.name} Settings` };
    }
  }
  return { title: "Team Settings" };
}

async function TeamSettingsContainer({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  await requirePermission(canAccessTeam, { teamId });

  return <TeamSettings teamId={teamId} />;
}

export default async function TeamSettingsPage({
  params,
}: TeamSettingsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-96" />
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <TeamSettingsContainer params={params} />
        </div>
      </div>
    </Suspense>
  );
}
