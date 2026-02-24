import { Card, CardContent } from "@/components/ui/card";
import { PrivilegedAccessAlerts } from "@/features/admin/components/privileged-access/privileged-access-alerts";
import { PrivilegedAccessDashboard } from "@/features/admin/components/privileged-access/privileged-access-dashboard";
import { SuperadminManagement } from "@/features/admin/components/privileged-access/superadmin-management";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { isSuperAdmin } from "@/lib/rbac/rbac";
import { PrivilegedAccessQueries } from "@/server/data-access/privileged-access.queries";
import { PrivilegedAccessService } from "@/server/services/privileged-access.service";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function PrivilegedAccessContent() {
  const [betterAuthSession, hasAuditLogPermission] = await Promise.all([
    getBetterAuthSession(),
    checkPermission({
      ...Permissions["audit-log"].read,
    }),
  ]);

  if (betterAuthSession.isErr()) {
    redirect("/");
  }

  const { user, organization } = betterAuthSession.value;

  if (!user || !organization) {
    redirect("/");
  }

  if (!hasAuditLogPermission) {
    redirect("/");
  }

  const isSuperAdminUser = isSuperAdmin(user);

  const [privilegedUsers, stats, recentActions, roleChanges, alertsResult] =
    await Promise.all([
      PrivilegedAccessQueries.getAllPrivilegedUsers(
        isSuperAdminUser ? undefined : organization.id
      ),
      PrivilegedAccessQueries.getPrivilegedAccessStats(
        isSuperAdminUser ? undefined : organization.id
      ),
      PrivilegedAccessQueries.getRecentPrivilegedActions(organization.id, 50),
      PrivilegedAccessQueries.getRoleChangeHistory(
        organization.id,
        undefined,
        30
      ),
      PrivilegedAccessService.detectAnomalies(organization.id),
    ]);

  const alerts = alertsResult.isOk() ? alertsResult.value : [];

  return (
    <div className="container mx-auto max-w-7xl py-12 px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Privileged Access Control</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage high-privilege accounts. Compliance with
          SSD-7.1.02.
        </p>
      </div>

      <div className="space-y-6">
        {alerts.length > 0 && <PrivilegedAccessAlerts alerts={alerts} />}

        {isSuperAdminUser && (
          <SuperadminManagement isSuperAdmin={isSuperAdminUser} />
        )}

        <PrivilegedAccessDashboard
          privilegedUsers={privilegedUsers}
          stats={stats}
          recentActions={recentActions}
          roleChanges={roleChanges}
          isSuperAdmin={isSuperAdminUser}
        />
      </div>
    </div>
  );
}

export default function PrivilegedAccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl py-12 px-6">
          <div className="mb-10 space-y-2">
            <div className="h-9 bg-muted rounded w-64 animate-pulse" />
            <div className="h-5 bg-muted rounded w-96 animate-pulse" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-24 animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16 animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PrivilegedAccessContent />
    </Suspense>
  );
}
