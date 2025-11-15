"use server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/rbac";
import {
  getCachedTeamsByOrganization,
  getCachedDepartmentsByOrganization,
} from "@/server/cache";
import { TeamManagementClient } from "./team-management-client";

export async function TeamManagement() {
  const authResult = await getAuthSession();

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

  const { user, organization } = authResult.value;
  const orgCode =
    ((organization as unknown as Record<string, unknown>).org_code as
      | string
      | undefined) ||
    ((organization as unknown as Record<string, unknown>).code as
      | string
      | undefined);

  if (!orgCode) {
    return null;
  }

  const canEdit = user ? isOrganizationAdmin(user) : false;
  const teams = await getCachedTeamsByOrganization(orgCode);
  const departments = await getCachedDepartmentsByOrganization(orgCode);

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
          departments={departments}
          canEdit={canEdit}
          organizationId={orgCode}
        />
      </CardContent>
    </Card>
  );
}

