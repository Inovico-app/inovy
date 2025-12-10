import { Skeleton } from "@/components/ui/skeleton";
import { TeamSettings } from "@/features/teams/components/team-settings";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  canAccessTeam,
  isOrganizationAdmin,
  isTeamManager,
} from "@/lib/rbac/rbac";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface TeamSettingsPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function TeamSettingsContainer({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization
  ) {
    redirect("/");
  }

  const { user } = authResult.value;

  // user is guaranteed to be non-null after authentication check
  if (!user) {
    redirect("/");
  }

  // Check if user can access this team
  const hasAccess = await canAccessTeam(user, teamId);
  if (!hasAccess) {
    redirect("/");
  }

  // Check permissions
  const isAdmin = isOrganizationAdmin(user);
  const isLead = await isTeamManager(user, teamId);
  const canManage = isAdmin || isLead;

  if (!canManage) {
    redirect(`/teams/${teamId}`);
  }

  return <TeamSettings teamId={teamId} />;
}

export default async function TeamSettingsPage({
  params,
}: TeamSettingsPageProps) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TeamSettingsContainer params={params} />
    </Suspense>
  );
}

