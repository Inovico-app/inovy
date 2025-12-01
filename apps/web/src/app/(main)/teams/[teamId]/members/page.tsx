import { Skeleton } from "@/components/ui/skeleton";
import { TeamMemberManagement } from "@/features/teams/components/team-member-management";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import {
  canAccessTeam,
  isOrganizationAdmin,
  isTeamManager,
} from "@/lib/rbac/rbac";
import { redirect } from "next/navigation";
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

  return <TeamMemberManagement teamId={teamId} />;
}

export default async function TeamMembersPage({
  params,
}: TeamMembersPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      }
    >
      <TeamMembersContainer params={params} />
    </Suspense>
  );
}

