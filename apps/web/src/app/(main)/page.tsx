import { ProtectedPage } from "@/components/protected-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TaskCard } from "@/features/tasks/components/task-card";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { filterTasksByStatus } from "@/lib/filters/task-filters";
import { logger } from "@/lib/logger";
import { getCachedDashboardOverview } from "@/server/cache/dashboard.cache";
import {
  getCachedTaskStats,
  getCachedTasksWithContext,
} from "@/server/cache/task.cache";
import { OnboardingService } from "@/server/services/onboarding.service";
import {
  Building2,
  FolderIcon,
  ListTodoIcon,
  MicIcon,
  PlusIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

async function DashboardContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr()) {
    logger.error("Failed to get user session in Dashboard", {
      component: "DashboardContent",
      error: authResult.error,
    });

    // Show error state in dashboard
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-destructive">
            Unable to Load Dashboard
          </h1>
          <p className="text-muted-foreground">
            We encountered an error loading your user information. Please try
            refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  const { user, organization } = authResult.value;
  if (!user) {
    logger.warn("User session returned null in Dashboard", {
      component: "DashboardContent",
    });

    // This shouldn't happen in a protected page, but handle gracefully
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
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
    // Log but don't fail dashboard load
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
      <div className="container mx-auto max-w-6xl px-4 py-8">
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

  // Get dashboard overview (cached)
  const dashboardStats = await getCachedDashboardOverview(organizationId);

  // Get task statistics (cached)
  const taskStats = await getCachedTaskStats(user.id, organizationId);

  // Get recent tasks (limit to 3 for dashboard) - cached
  const recentTasks = await getCachedTasksWithContext(user.id, organizationId);

  // Filter by status and limit to 3
  const filteredTasks = filterTasksByStatus(recentTasks, [
    "pending",
    "in_progress",
  ]).slice(0, 3);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.name ?? user?.email}
          </h1>
          <p className="text-muted-foreground">
            Manage your projects, recordings, and AI-generated tasks in one
            place.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/projects/create">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  New Project
                </CardTitle>
                <PlusIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Create</div>
                <p className="text-xs text-muted-foreground">
                  Start organizing your recordings
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/projects">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                <FolderIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardStats?.stats.totalProjects ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Active projects</p>
              </CardContent>
            </Card>
          </Link>

          <Link href={"/recordings" as Route}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recordings
                </CardTitle>
                <MicIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardStats?.stats.totalRecordings ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total recordings
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tasks">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Tasks
                </CardTitle>
                <ListTodoIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {taskStats
                    ? taskStats.byStatus.pending +
                      taskStats.byStatus.in_progress
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Action items to review
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Organization Chat Feature */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  Organization-Wide Chat
                  <span className="text-xs font-normal bg-primary/10 text-primary px-2 py-1 rounded-full">
                    New
                  </span>
                </CardTitle>
                <CardDescription>
                  Search and ask questions across all projects
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get instant answers from all your recordings, transcriptions, and
              tasks across the entire organization. Perfect for finding
              cross-project insights and patterns.
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/chat">
                <Building2 className="mr-2 h-4 w-4" />
                Open Organization Chat
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Tasks Section */}
        {filteredTasks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Tasks</CardTitle>
                  <CardDescription>
                    Your most recent pending action items
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/tasks">View All Tasks</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} showContext />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Get Started Section */}
        <Card>
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
      </div>
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

