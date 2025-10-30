import { ProtectedPage } from "@/components/protected-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { FolderIcon, ListTodoIcon, MicIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function DashboardContent() {
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
                <div className="text-2xl font-bold">0</div>
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
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total recordings</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Tasks
              </CardTitle>
              <ListTodoIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Action items to review
              </p>
            </CardContent>
          </Card>
        </div>

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

