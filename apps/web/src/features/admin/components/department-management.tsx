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
import { getCachedDepartmentsByOrganization } from "@/server/cache";
import { DepartmentManagementClient } from "./department-management-client";

export async function DepartmentManagement() {
  const authResult = await getAuthSession();

  if (authResult.isErr() || !authResult.value.organization) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to load departments. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    user,
    organization: { orgCode },
  } = authResult.value;

  if (!orgCode) {
    return null;
  }

  const canEdit = user ? isOrganizationAdmin(user) : false;
  const departments = await getCachedDepartmentsByOrganization(orgCode);

  // Build hierarchy
  const topLevelDepartments = departments.filter((d) => !d.parentDepartmentId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>
          Manage organizational departments and hierarchy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DepartmentManagementClient
          departments={departments}
          topLevelDepartments={topLevelDepartments}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  );
}

