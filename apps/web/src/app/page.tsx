import { ProtectedPage } from "@/components/protected-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ensureUserOrganization } from "@/features/auth/actions/ensure-organization";
import { TaskCard } from "@/features/tasks/components/task-card";
import { getAuthSession, getUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { DashboardService, TaskService } from "@/server/services";
import {
  FolderIcon,
  ListTodoIcon,
  MicIcon,
  PlusIcon,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function DashboardContent() {
  // Ensure user has organization assigned
  await ensureUserOrganization();

  const userResult = await getUserSession();

  if (userResult.isErr()) {
    logger.error("Failed to get user session in Dashboard", {
      component: "DashboardContent",
      error: userResult.error,
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

  const user = userResult.value;

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

  // Get task statistics
  const taskStatsResult = await TaskService.getTaskStats();
  const taskStats = taskStatsResult.isOk() ? taskStatsResult.value : null;

  // Get recent tasks (limit to 3 for dashboard)
  const recentTasksResult = await TaskService.getTasksWithContext();
  const recentTasks = recentTasksResult.isOk()
    ? recentTasksResult.value
        .filter((t) => t.status === "pending" || t.status === "in_progress")
        .slice(0, 3)
    : [];

  // Get dashboard overview with real data
  const authResult = await getAuthSession();
  let dashboardOverview = null;

  if (authResult.isOk() && authResult.value.organization) {
    const orgCode = (
      authResult.value.organization as unknown as Record<string, unknown>
    ).org_code as string | undefined;
    if (orgCode) {
      const dashboardResult = await DashboardService.getDashboardOverview(
        orgCode
      );
      dashboardOverview = dashboardResult.isOk() ? dashboardResult.value : null;
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.given_name || user?.email}
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
                  {dashboardOverview?.stats.totalProjects ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Active projects</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recordings</CardTitle>
              <MicIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardOverview?.stats.totalRecordings ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Total recordings</p>
            </CardContent>
          </Card>

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
        {recentTasks.length > 0 && (
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
              {recentTasks.map((task) => (
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
  // CACHE COMPONENTS: Wrap dynamic content in Suspense to enable static shell generation
  // The ProtectedPage component accesses auth data, making it dynamic
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-8 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <DashboardContent />
      </ProtectedPage>
    </Suspense>
  );
}

