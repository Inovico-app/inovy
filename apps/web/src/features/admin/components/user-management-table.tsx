"use server";

import { getAuthSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getOrganizationMembers } from "@/server/data-access/organization.queries";
import {
  getCachedUserTeams,
  getCachedTeamsByOrganization,
} from "@/server/cache";
import { UserRoleBadge } from "./user-role-badge";
import { Badge } from "@/components/ui/badge";

export async function UserManagementTable() {
  try {
    const authResult = await getAuthSession();

    if (
      authResult.isErr() ||
      !authResult.value.isAuthenticated ||
      !authResult.value.organization
    ) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Unable to load users. Please refresh and try again.
            </p>
          </CardContent>
        </Card>
      );
    }

    const { organization } = authResult.value;
    const members = await getOrganizationMembers(organization.orgCode);

    // Fetch teams for all users
    const allTeams = await getCachedTeamsByOrganization(organization.orgCode);
    const teamMap = new Map(allTeams.map((t) => [t.id, t]));
    const userTeamsMap = new Map<string, Array<{ teamId: string; role: string }>>();

    for (const member of members) {
      const userTeams = await getCachedUserTeams(member.id, organization.orgCode);
      userTeamsMap.set(
        member.id,
        userTeams.map((ut) => ({ teamId: ut.teamId, role: ut.role }))
      );
    }

    if (!members || members.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No users found in this organization.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-muted">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 font-semibold">Roles</th>
                  <th className="text-left py-3 px-4 font-semibold">Teams</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-muted hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {member.given_name && member.family_name
                          ? `${member.given_name} ${member.family_name}`
                          : member.given_name || member.family_name || "Unknown"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {member.email || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {member.roles && member.roles.length > 0 ? (
                          member.roles.map((role) => (
                            <UserRoleBadge key={role} role={role} />
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No roles
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const userTeams = userTeamsMap.get(member.id) || [];
                          return userTeams.length > 0 ? (
                            userTeams.map((ut) => {
                              const team = teamMap.get(ut.teamId);
                              if (!team) return null;
                              return (
                                <Badge
                                  key={ut.teamId}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {team.name}
                                  {ut.role !== "member" && (
                                    <span className="ml-1 text-muted-foreground">
                                      ({ut.role})
                                    </span>
                                  )}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No teams
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    logger.error(
      "Failed to fetch organization members",
      {},
      error as Error
    );
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">
            Failed to load users. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }
}

