import { Skeleton } from "@/components/ui/skeleton";
import { AgentAnalyticsCharts } from "@/features/admin/components/agent/agent-analytics-charts";
import { AgentMetricsExport } from "@/features/admin/components/agent/agent-metrics-export";
import { AgentMetricsFilters } from "@/features/admin/components/agent/agent-metrics-filters";
import { AgentMetricsTable } from "@/features/admin/components/agent/agent-metrics-table";
import { TopQueriesTable } from "@/features/admin/components/agent/top-queries-table";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { AgentAnalyticsService } from "@/server/services/agent-analytics.service";
import { AgentMetricsService } from "@/server/services/agent-metrics.service";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Agent Metrics",
  description: "View detailed agent metrics and performance data",
};

interface AgentMetricsContentProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    organizationId?: string;
    userId?: string;
    page?: string;
  }>;
}

async function AgentMetricsContent({
  searchParams,
}: AgentMetricsContentProps) {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    redirect("/sign-in");
  }

  const { user, organization } = authResult.value;

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has admin permissions (admin or superadmin)
  const hasAdminPermission = await checkPermission(Permissions.admin.all);
  const hasSuperAdminPermission = await checkPermission(
    Permissions.superadmin.all
  );

  if (!hasAdminPermission) {
    redirect("/");
  }

  // Parse search params
  const params = await searchParams;
  const startDate = params.startDate
    ? new Date(params.startDate)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  // For non-superadmins, automatically filter by their organization
  const organizationId = hasSuperAdminPermission
    ? params.organizationId
    : organization?.id || params.organizationId;
  const userId = params.userId;

  const filters = {
    startDate,
    endDate,
    organizationId,
    userId,
  };

  // Pagination
  const currentPage = params.page ? parseInt(params.page, 10) : 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  // Fetch all data
  const [
    metricsResult,
    requestCountResult,
    latencyResult,
    errorRateResult,
    tokenUsageResult,
    toolUsageResult,
    topQueriesResult,
    organizationsResult,
    usersResult,
  ] = await Promise.all([
    AgentMetricsService.getMetrics(filters, limit, offset),
    AgentAnalyticsService.getRequestCountOverTime(filters),
    AgentAnalyticsService.getAverageLatency(filters),
    AgentAnalyticsService.getErrorRate(filters),
    AgentAnalyticsService.getTokenUsage(filters),
    AgentAnalyticsService.getToolUsageStats(filters),
    AgentAnalyticsService.getTopQueries(filters, 10),
    AgentAnalyticsService.getOrganizationsList(),
    AgentAnalyticsService.getUsersList(organizationId),
  ]);

  const metrics = metricsResult.isOk() ? metricsResult.value.metrics : [];
  const total = metricsResult.isOk() ? metricsResult.value.total : 0;
  const requestCount = requestCountResult.isOk()
    ? requestCountResult.value
    : [];
  const latency = latencyResult.isOk() ? latencyResult.value : [];
  const errorRate = errorRateResult.isOk() ? errorRateResult.value : [];
  const tokenUsage = tokenUsageResult.isOk() ? tokenUsageResult.value : [];
  const toolUsage = toolUsageResult.isOk() ? toolUsageResult.value : [];
  const topQueries = topQueriesResult.isOk() ? topQueriesResult.value : [];
  const organizations = organizationsResult.isOk()
    ? organizationsResult.value
    : [];
  const users = usersResult.isOk() ? usersResult.value : [];

  return (
    <div className="container mx-auto max-w-[1600px] py-6 px-4 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Agent Metrics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View detailed agent metrics and performance data
          </p>
        </div>
        <AgentMetricsExport filters={filters} />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Main Content */}
        <div className="min-w-0 flex-1">
          <div className="space-y-8">
            {/* Analytics Overview Charts */}
            <AgentAnalyticsCharts
              requestCount={requestCount}
              latency={latency}
              errorRate={errorRate}
              tokenUsage={tokenUsage}
              toolUsage={toolUsage}
            />

            {/* Top Queries */}
            <TopQueriesTable queries={topQueries} />

            {/* Detailed Metrics Table */}
            <AgentMetricsTable
              metrics={metrics}
              total={total}
              limit={limit}
              currentPage={currentPage}
            />
          </div>
        </div>

        {/* Sidebar Filters - Sticky Position */}
        <aside className="sticky top-6 h-fit w-full self-start lg:w-64">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Filters</h2>
            <AgentMetricsFilters
              initialStartDate={startDate}
              initialEndDate={endDate}
              initialOrganizationId={organizationId}
              initialUserId={userId}
              organizations={organizations}
              users={users}
              isSuperAdmin={hasSuperAdminPermission}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function AgentMetricsPage({
  searchParams,
}: AgentMetricsContentProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-[1600px] py-6 px-4 lg:px-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 lg:h-9" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="flex flex-col gap-6 lg:flex-row">
            <main className="min-w-0 flex-1 space-y-8">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </main>
            <aside className="w-full shrink-0 lg:w-64">
              <Skeleton className="h-96 w-full rounded-lg" />
            </aside>
          </div>
        </div>
      }
    >
      <AgentMetricsContent searchParams={searchParams} />
    </Suspense>
  );
}

