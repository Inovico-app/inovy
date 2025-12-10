import { TasksListServer } from "@/features/tasks/components/tasks-list-server";
import { Suspense } from "react";

export default async function TasksPage() {
  // CACHE COMPONENTS: Wrap dynamic content in Suspense to enable static shell generation
  // TasksListServer uses cache functions for data fetching
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Tasks</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all your assigned tasks across all projects
            </p>
          </div>

          {/* Tasks List - Server component with cache functions */}
          <TasksListServer />
        </div>
      </div>
    </Suspense>
  );
}

