"use server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
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
    user,
    organization: { id: organizationId },
  } = authResult.value;

  const canEdit = user ? isOrganizationAdmin(user) : false;
  const teams = await getCachedTeamsWithMemberCounts(organizationId);

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

