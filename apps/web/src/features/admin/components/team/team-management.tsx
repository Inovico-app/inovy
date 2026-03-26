"use server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthContext } from "@/lib/auth-context";
import { getBetterAuthSession } from "@/lib/better-auth-session";

import { getCachedTeamsWithMemberCounts } from "@/server/cache/team.cache";
import { TeamManagementClient } from "./team-management-client";

export async function TeamManagement() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.organization) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to load teams. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    member,
    organization: { id: organizationId },
  } = authResult.value;

  const canEdit = member
    ? ["owner", "admin", "superadmin"].includes(member.role)
    : false;

  const auth: AuthContext = {
    user: authResult.value.user!,
    organizationId,
    userTeamIds: authResult.value.userTeamIds ?? [],
  };
  const teams = await getCachedTeamsWithMemberCounts(organizationId, auth);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teams</CardTitle>
        <CardDescription>
          Manage teams and assign users to teams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TeamManagementClient
          teams={teams}
          canEdit={canEdit}
          organizationId={organizationId}
        />
      </CardContent>
    </Card>
  );
}
