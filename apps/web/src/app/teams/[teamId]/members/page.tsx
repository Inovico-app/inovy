import { PageLayout } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMemberManagement } from "@/features/teams/components/team-member-management";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { canAccessTeam, isOrganizationAdmin, isTeamLead } from "@/lib/rbac/rbac";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface TeamMembersPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function TeamMembersContainer({ teamId }: { teamId: string }) {
  const authResult = await getAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization
  ) {
    redirect("/");
  }

  const { user } = authResult.value;

  // Check if user can access this team
  const hasAccess = await canAccessTeam(user, teamId);
  if (!hasAccess) {
    redirect("/");
  }

  // Check permissions
  const isAdmin = isOrganizationAdmin(user);
  const isLead = await isTeamLead(user, teamId);
  const canManage = isAdmin || isLead;

  if (!canManage) {
    redirect(`/teams/${teamId}`);
  }

  return <TeamMemberManagement teamId={teamId} />;
}

export default async function TeamMembersPage({
  params,
}: TeamMembersPageProps) {
  const { teamId } = await params;

  return (
    <PageLayout>
      <Suspense
        fallback={
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        }
      >
        <TeamMembersContainer teamId={teamId} />
      </Suspense>
    </PageLayout>
  );
}

