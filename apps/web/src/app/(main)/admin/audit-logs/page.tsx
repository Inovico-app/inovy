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
import { getTranslations } from "next-intl/server";
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
    category?: string;
  }>;
}

async function AuditLogsContent({ searchParams }: AuditLogsPageProps) {
  const t = await getTranslations("admin.auditLogs");
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

  const categoryParam = params.category ?? "mutation";
  const categoryFilter: AuditLogFilters["category"] =
    categoryParam === "all" || categoryParam === undefined
      ? undefined
      : categoryParam === "mutation" || categoryParam === "read"
        ? [categoryParam]
        : undefined;

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
    category: categoryFilter,
    resourceId: params.resourceId ?? undefined,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
    limit: params.limit ? parseInt(params.limit, 10) : 100,
    offset: params.offset ? parseInt(params.offset, 10) : 0,
  };

  const result = await AuditLogService.getAuditLogs(organization.id, filters);

  const auditLogs = result.isOk() ? result.value : { logs: [], total: 0 };

  return (
    <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("viewerTitle")}</CardTitle>
          <CardDescription>{t("viewerDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditLogViewer
            initialData={auditLogs}
            initialFilters={{ ...params, category: categoryParam }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditLogsPage(props: AuditLogsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl py-6 px-4 md:py-12 md:px-6">
          <div className="mb-10 space-y-2">
            <div className="h-9 bg-muted rounded w-48 animate-pulse" />
            <div className="h-5 bg-muted rounded w-96 animate-pulse" />
          </div>
          <Card>
            <CardContent className="py-12">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
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
