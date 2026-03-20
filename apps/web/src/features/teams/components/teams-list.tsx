import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { TeamService } from "@/server/services/team.service";
import { UsersIcon } from "lucide-react";
import Link from "next/link";

export async function TeamsList() {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization ||
    !authResult.value.user
  ) {
    return (
      <p className="text-muted-foreground text-center py-8">
        Unable to load teams. Please refresh.
      </p>
    );
  }

  const { user, member, organization, userTeamIds } = authResult.value;
  const isAdmin = isOrganizationAdmin(user, member);

  const teamsResult = await TeamService.getTeamsByOrganization(organization.id);
  const allTeams = teamsResult.isOk() ? teamsResult.value : [];

  // Filter: admins see all, others see only their teams
  const visibleTeams = isAdmin
    ? allTeams
    : allTeams.filter((t) => userTeamIds.includes(t.id));

  if (visibleTeams.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        You are not a member of any teams yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleTeams.map((team) => (
        <Link key={team.id} href={`/teams/${team.id}`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg">{team.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                <span>View team</span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
