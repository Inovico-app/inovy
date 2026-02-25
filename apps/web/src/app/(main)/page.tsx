import { ProtectedPage } from "@/components/protected-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardGreeting } from "@/features/dashboard/components/dashboard-greeting";
import { DashboardPendingTasks } from "@/features/dashboard/components/dashboard-pending-tasks";
import { DashboardRecentRecordings } from "@/features/dashboard/components/dashboard-recent-recordings";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { DashboardUpcomingMeetings } from "@/features/dashboard/components/dashboard-upcoming-meetings";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { filterTasksByStatus } from "@/lib/filters/task-filters";
import { logger } from "@/lib/logger";
import { getCachedCalendarMeetings } from "@/server/cache/calendar-meetings.cache";
import { getCachedDashboardOverview } from "@/server/cache/dashboard.cache";
import {
  getCachedTaskStats,
  getCachedTasksWithContext,
} from "@/server/cache/task.cache";
import { OnboardingService } from "@/server/services/onboarding.service";
import Link from "next/link";

async function DashboardContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr()) {
    logger.error("Failed to get user session in Dashboard", {
      component: "DashboardContent",
      error: authResult.error,
    });

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-destructive">
            Unable to Load Dashboard
          </h1>
          <p className="text-muted-foreground">
            We encountered an error loading your user information. Please try
            refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const { user, organization } = authResult.value;
  if (!user) {
    logger.warn("User session returned null in Dashboard", {
      component: "DashboardContent",
    });

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome to Inovy</h1>
          <p className="text-muted-foreground">
            Please log in to access your dashboard.
          </p>
        </div>
      </div>
    );
  }

  try {
    await OnboardingService.ensureOnboardingRecordExists(user.id);
  } catch (error) {
    logger.error("Failed to ensure onboarding record exists", {
      userId: user.id,
      error,
    });
  }

  if (!organization) {
    logger.warn("User has no organization in Dashboard", {
      component: "DashboardContent",
      userId: user.id,
    });

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Organization Required</h1>
          <p className="text-muted-foreground">
            You need to be part of an organization to access the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const organizationId = organization.id;
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [dashboardStats, taskStats, recentTasks, upcomingMeetings] =
    await Promise.all([
      getCachedDashboardOverview(organizationId),
      getCachedTaskStats(user.id, organizationId),
      getCachedTasksWithContext(user.id, organizationId),
      getCachedCalendarMeetings(user.id, organizationId, now, endOfDay).catch(
        () => []
      ),
    ]);

  const filteredTasks = filterTasksByStatus(recentTasks, [
    "pending",
    "in_progress",
  ]).slice(0, 3);

  const totalProjects = dashboardStats?.stats.totalProjects ?? 0;
  const totalRecordings = dashboardStats?.stats.totalRecordings ?? 0;
  const pendingTaskCount = taskStats
    ? taskStats.byStatus.pending + taskStats.byStatus.in_progress
    : 0;
  const isNewUser = totalProjects === 0 && totalRecordings === 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-8">
        {/* Hero: Greeting + primary CTA */}
        <DashboardGreeting
          userName={user.name ?? user.email}
          pendingTaskCount={pendingTaskCount}
          upcomingMeetingCount={upcomingMeetings.length}
        />

        {/* Overview statistics */}
        <DashboardStats
          totalProjects={totalProjects}
          totalRecordings={totalRecordings}
          taskStats={taskStats}
        />

        {/* Today's meetings */}
        <DashboardUpcomingMeetings meetings={upcomingMeetings} />

        {/* Tasks and recordings side by side */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <DashboardPendingTasks tasks={filteredTasks} />
          <DashboardRecentRecordings
            recordings={dashboardStats?.recentRecordings ?? []}
          />
        </div>
      </div>

      {/* Conditional: Get Started for new users */}
      {isNewUser && (
        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Follow these steps to start managing your meeting recordings and
              tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                  1
                </div>
                <span className="text-sm">
                  Create your first project to organize recordings
                </span>
                <Button size="sm" asChild>
                  <Link href="/projects/create">Create Project</Link>
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  2
                </div>
                <span className="text-sm">
                  Upload a meeting recording for AI processing
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  3
                </div>
                <span className="text-sm">
                  Review AI-generated summaries and action items
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  4
                </div>
                <span className="text-sm">
                  Track and manage your tasks across all projects
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function Home() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}

