import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuditLogViewer } from "@/features/admin/components/audit/audit-log-viewer";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import type { AuditLogFilters } from "@/server/data-access/audit-logs.queries";
import { AuditLogService } from "@/server/services/audit-log.service";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface AuditLogsPageProps {
  searchParams: Promise<{
    eventType?: string;
    resourceType?: string;
    action?: string;
    userId?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
    offset?: string;
  }>;
}

async function AuditLogsContent({ searchParams }: AuditLogsPageProps) {
  const [betterAuthSession, hasAuditLogPermission] = await Promise.all([
    getBetterAuthSession(),
    checkPermission({
      ...Permissions["audit-log"].read,
    }),
  ]);

  if (betterAuthSession.isErr()) {
    redirect("/");
  }

  const { organization } = betterAuthSession.value;

  if (!organization) {
    redirect("/");
  }

  if (!hasAuditLogPermission) {
    redirect("/");
  }

  const params = await searchParams;

  const filters: AuditLogFilters = {
    userId: params.userId ?? undefined,
    eventType: params.eventType
      ? (params.eventType.split(",") as AuditLogFilters["eventType"])
      : undefined,
    resourceType: params.resourceType
      ? (params.resourceType.split(",") as AuditLogFilters["resourceType"])
      : undefined,
    action: params.action
      ? (params.action.split(",") as AuditLogFilters["action"])
      : undefined,
    resourceId: params.resourceId ?? undefined,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    limit: params.limit ? parseInt(params.limit, 10) : 100,
    offset: params.offset ? parseInt(params.offset, 10) : 0,
  };

  const result = await AuditLogService.getAuditLogs(organization.id, filters);

  const auditLogs = result.isOk() ? result.value : { logs: [], total: 0 };

  return (
    <div className="container mx-auto max-w-5xl py-12 px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground mt-2">
          Comprehensive audit trail for all system actions. Supports SOC 2
          compliance requirements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log Viewer</CardTitle>
          <CardDescription>
            View and filter audit logs for compliance and security monitoring.
            All logs are tamper-proof via hash chain verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogViewer initialData={auditLogs} initialFilters={params} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogsPage(props: AuditLogsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-5xl py-12 px-6">
          <div className="mb-10 space-y-2">
            <div className="h-9 bg-muted rounded w-48 animate-pulse" />
            <div className="h-5 bg-muted rounded w-96 animate-pulse" />
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
      <AuditLogsContent {...props} />
    </Suspense>
  );
}

