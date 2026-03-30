import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/formatters/date-formatters";
import type { AuthContext } from "@/lib/auth-context";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { hasRole } from "@/lib/permissions/predicates";
import { isValidRole } from "@/lib/permissions/types";
import { getCachedTeamsWithMemberCounts } from "@/server/cache/team.cache";
import { CalendarIcon, PlusIcon, UsersIcon } from "lucide-react";
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
  const memberRole = member && isValidRole(member.role) ? member.role : "user";
  const isAdmin = hasRole("admin").check({ role: memberRole, userId: user.id });

  const auth: AuthContext = {
    user,
    organizationId: organization.id,
    userTeamIds: userTeamIds ?? [],
  };
  const allTeams = await getCachedTeamsWithMemberCounts(organization.id, auth);

  // Filter: admins see all, others see only their teams
  const visibleTeams = isAdmin
    ? allTeams
    : allTeams.filter((t) => userTeamIds.includes(t.id));

  if (visibleTeams.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <UsersIcon className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
          <p className="text-muted-foreground mb-6">
            {isAdmin
              ? "Create your first team to start organizing members."
              : "You are not a member of any teams yet."}
          </p>
          {isAdmin && (
            <Link href="/admin">
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Manage Teams
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {visibleTeams.map((team) => (
        <Card
          key={team.id}
          className="hover:shadow-lg transition-shadow cursor-pointer h-full"
        >
          <Link href={`/teams/${team.id}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{team.name}</span>
                <Badge variant="secondary">
                  {team.memberCount}{" "}
                  {team.memberCount === 1 ? "member" : "members"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {team.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {team.description}
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-center text-xs text-muted-foreground">
                  <UsersIcon className="h-3 w-3 mr-1" />
                  {team.memberCount}{" "}
                  {team.memberCount === 1 ? "member" : "members"}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  Created {formatDateShort(new Date(team.createdAt))}
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}
