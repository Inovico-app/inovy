import { PageLayout } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamDashboard } from "@/features/teams/components/team-dashboard";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { canAccessTeam } from "@/lib/rbac/rbac";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface TeamPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function TeamDashboardContainer({ teamId }: { teamId: string }) {
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

  return <TeamDashboard teamId={teamId} />;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;

  return (
    <PageLayout>
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        }
      >
        <TeamDashboardContainer teamId={teamId} />
      </Suspense>
    </PageLayout>
  );
}

