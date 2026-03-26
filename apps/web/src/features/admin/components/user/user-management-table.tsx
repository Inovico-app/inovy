"use server";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveAuthContext } from "@/lib/auth-context";
import { getUserDisplayName } from "@/lib/formatters/display-formatters";
import { logger } from "@/lib/logger";
import { getCachedTeamsByOrganization } from "@/server/cache/team.cache";
import { OrganizationService } from "@/server/services/organization.service";
import { TeamService } from "@/server/services/team.service";
import { InviteUserDialog } from "../organization/invite-user-dialog";
import { UserActionsMenu } from "./user-actions-menu";
import { getTranslations } from "next-intl/server";
import { UserRoleBadge } from "./user-role-badge";

export async function UserManagementTable() {
  const t = await getTranslations("admin.users");
  let authResult;
  let membersResult;
  let allTeams;
  let userTeamsResult;
  let fetchError: Error | null = null;

  try {
    authResult = await resolveAuthContext("UserManagementTable");
  } catch (error) {
    logger.error("Failed to fetch organization members", {}, error as Error);
    fetchError = error as Error;
  }

  if (fetchError || !authResult) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">{t("failedToLoad")}</p>
        </CardContent>
      </Card>
    );
  }

  if (authResult.isErr()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t("unableToLoadUsers")}</p>
        </CardContent>
      </Card>
    );
  }

  const auth = authResult.value;
  const organization = { id: auth.organizationId };

  try {
    membersResult = await OrganizationService.getOrganizationMembers(
      organization.id,
    );

    // Fetch teams for all users in a single batch query
    allTeams = await getCachedTeamsByOrganization(organization.id, auth);

    // Batch fetch all user teams
    userTeamsResult = await TeamService.getUserTeamsByUserIds(
      membersResult.isOk() ? membersResult.value.map((m) => m.id) : [],
      organization.id,
      auth,
    );
  } catch (error) {
    logger.error("Failed to fetch organization members", {}, error as Error);
    fetchError = error as Error;
  }

  if (fetchError || !membersResult || !allTeams || !userTeamsResult) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">{t("failedToLoad")}</p>
        </CardContent>
      </Card>
    );
  }

  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  const userTeamsMap = new Map<
    string,
    Array<{ teamId: string; role: string }>
  >();
  if (userTeamsResult.isOk()) {
    const batchUserTeamsMap = userTeamsResult.value;
    for (const [userId, userTeams] of batchUserTeamsMap.entries()) {
      userTeamsMap.set(
        userId,
        userTeams.map((ut) => ({ teamId: ut.teamId, role: ut.role })),
      );
    }
  }

  const members = membersResult.isOk() ? membersResult.value : [];

  if (!members.length) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{t("noUsers")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("organizationMembers")}</CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? "s" : ""} in your
              organization
            </CardDescription>
          </div>
          <InviteUserDialog />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-muted">
                <th className="text-left py-3 px-4 font-semibold">
                  {t("name")}
                </th>
                <th className="text-left py-3 px-4 font-semibold">
                  {t("email")}
                </th>
                <th className="text-left py-3 px-4 font-semibold">
                  {t("roles")}
                </th>
                <th className="text-left py-3 px-4 font-semibold">
                  {t("teams")}
                </th>
                <th className="text-right py-3 px-4 font-semibold w-[50px]">
                  {t("actions")}
                </th>
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
                      {getUserDisplayName({
                        email: member.email,
                        given_name: member.given_name,
                        family_name: member.family_name,
                      })}
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
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      <UserActionsMenu
                        memberId={member.id}
                        memberEmail={member.email || ""}
                        memberName={getUserDisplayName({
                          email: member.email,
                          given_name: member.given_name,
                          family_name: member.family_name,
                        })}
                        currentRole={member.roles?.[0]}
                      />
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
}
