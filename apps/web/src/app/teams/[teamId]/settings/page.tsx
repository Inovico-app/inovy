import { PageLayout } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamSettings } from "@/features/teams/components/team-settings";
import { getAuthSession } from "@/lib/auth/auth-helpers";
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

async function TeamSettingsContainer({ teamId }: { teamId: string }) {
  const authResult = await getAuthSession();

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
  const { teamId } = await params;

  return (
    <PageLayout>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <TeamSettingsContainer teamId={teamId} />
      </Suspense>
    </PageLayout>
  );
}

