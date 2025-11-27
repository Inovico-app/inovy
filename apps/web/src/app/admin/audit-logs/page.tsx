import { PageLayout } from "@/components/page-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuditLogViewer } from "@/features/admin/components/audit-log-viewer";
import { ROLES } from "@/lib";
import { getAuthSession } from "@/lib/auth";
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
  const authResult = await getAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    redirect("/");
  }

  const userRoles =
    authResult.value.user?.roles?.map((role) => role.toLowerCase()) ?? [];

  if (
    !userRoles.includes(ROLES.ADMIN) &&
    !userRoles.includes(ROLES.SUPER_ADMIN)
  ) {
    redirect("/");
  }

  const { organization } = authResult.value;
  if (!organization) {
    redirect("/");
  }

  const params = await searchParams;

  const filters = {
    userId: params.userId ?? undefined,
    eventType: params.eventType ? params.eventType.split(",") : undefined,
    resourceType: params.resourceType
      ? params.resourceType.split(",")
      : undefined,
    action: params.action ? params.action.split(",") : undefined,
    resourceId: params.resourceId ?? undefined,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    limit: params.limit ? parseInt(params.limit, 10) : 100,
    offset: params.offset ? parseInt(params.offset, 10) : 0,
  };

  const result = await AuditLogService.getAuditLogs(
    organization.orgCode,
    filters
  );

  const auditLogs = result.isOk() ? result.value : { logs: [], total: 0 };

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
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
    </PageLayout>
  );
}

export default function AuditLogsPage(props: AuditLogsPageProps) {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="space-y-6">
            <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
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
        </PageLayout>
      }
    >
      <AuditLogsContent {...props} />
    </Suspense>
  );
}

