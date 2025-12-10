import { Skeleton } from "@/components/ui/skeleton";
import { UserAnalyticsCharts } from "@/features/admin/components/agent/user-analytics-charts";
import { UserAnalyticsFilters } from "@/features/admin/components/agent/user-analytics-filters";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { AgentAnalyticsService } from "@/server/services/agent-analytics.service";
import { ok } from "neverthrow";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "User Analytics",
  description: "View user-specific agent engagement and feedback metrics",
};

interface UserAnalyticsContentProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
  }>;
}

async function UserAnalyticsContent({
  searchParams,
}: UserAnalyticsContentProps) {
  const authResult = await getBetterAuthSession();

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
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
  const endDate = params.endDate ? new Date(params.endDate) : new Date();

  // For non-superadmins, only show their own analytics
  // For superadmins, allow selecting a user
  const selectedUserId = hasSuperAdminPermission
    ? params.userId || user.id
    : user.id;

  // Get users list for filter dropdown (superadmins only)
  const usersResult = hasSuperAdminPermission
    ? await AgentAnalyticsService.getUsersList(organization?.id)
    : ok([]);

  const users = usersResult.isOk() ? usersResult.value : [];

  // Fetch user engagement metrics
  if (!organization) {
    redirect("/");
  }

  const engagementMetricsResult =
    await AgentAnalyticsService.getUserEngagementMetrics(
      selectedUserId,
      organization.id,
      startDate,
      endDate
    );

  const engagementMetrics = engagementMetricsResult.isOk()
    ? engagementMetricsResult.value
    : {
        totalConversations: 0,
        totalMessages: 0,
        averageMessagesPerConversation: 0,
        filesProcessed: 0,
        filesUsedInResponses: [],
        projectEngagement: [],
        uniqueProjectsCount: 0,
        queryComplexity: {
          averageQueryLength: 0,
          averageTokenCount: 0,
          totalTokens: 0,
          averageLatency: 0,
          errorRate: 0,
        },
        sourcePreference: {
          knowledgeBaseUsage: 0,
          recordingUsage: 0,
          taskUsage: 0,
          transcriptionUsage: 0,
          summaryUsage: 0,
          totalResponses: 0,
          knowledgeBasePercentage: 0,
        },
        conversationPatterns: {
          averageDuration: 0,
          longestConversation: 0,
          singleMessageConversations: 0,
          singleMessagePercentage: 0,
        },
        qualityIndicators: {
          averageResponseQuality: 0,
          followUpRate: 0,
          reEngagementRate: 0,
          averageSourcesPerResponse: 0,
        },
      };

  return (
    <div className="container mx-auto max-w-[1600px] py-6 px-4 lg:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold lg:text-3xl">User Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View user-specific agent engagement, file usage, and feedback metrics
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Main Content */}
        <div className="min-w-0 flex-1">
          <UserAnalyticsCharts
            engagementMetrics={engagementMetrics}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Sidebar Filters - Sticky Position */}
        {hasSuperAdminPermission && (
          <aside className="sticky top-6 h-fit w-full self-start lg:w-64">
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold">Filters</h2>
              <UserAnalyticsFilters
                initialStartDate={startDate}
                initialEndDate={endDate}
                initialUserId={selectedUserId}
                users={users}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function UserAnalyticsPage({
  searchParams,
}: UserAnalyticsContentProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-[1600px] py-6 px-4 lg:px-6">
          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-64 lg:h-9" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex flex-col gap-6 lg:flex-row">
            <main className="min-w-0 flex-1 space-y-8">
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
      <UserAnalyticsContent searchParams={searchParams} />
    </Suspense>
  );
}

