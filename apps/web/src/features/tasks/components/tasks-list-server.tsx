import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { getCachedTasksWithContext } from "@/server/cache/task.cache";
import { GlobalTaskListClient } from "./global-task-list-client";

/**
 * Server component that fetches tasks data and passes it to client component
 * Uses cache functions for optimal performance
 */
export async function TasksListServer() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.isAuthenticated) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Authentication required</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">User or organization not found</p>
      </div>
    );
  }

  // Fetch tasks and projects in parallel (both cached)
  const [tasks, projects] = await Promise.all([
    getCachedTasksWithContext(user.id, organization.id),
    getCachedUserProjects(organization.id),
  ]);

  return (
    <GlobalTaskListClient initialTasks={tasks} initialProjects={projects} />
  );
}

