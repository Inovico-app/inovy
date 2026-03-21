import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedUserProjects } from "@/server/cache/project.cache";
import { getCachedAllTasksWithContext } from "@/server/cache/task.cache";
import { GlobalTaskListClient } from "./global-task-list-client";

/**
 * Server component that fetches tasks data and passes it to client component
 * Fetches all org tasks (team-scoped) so users can see and help with team tasks
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

  const { user, organization, userTeamIds } = authResult.value;

  if (!user || !organization) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">User or organization not found</p>
      </div>
    );
  }

  // Fetch all org tasks (team-scoped) and projects in parallel
  const [tasks, projects] = await Promise.all([
    getCachedAllTasksWithContext(organization.id, {
      user,
      userTeamIds,
    }),
    getCachedUserProjects(organization.id, {
      userTeamIds,
      user,
    }),
  ]);

  return (
    <GlobalTaskListClient
      initialTasks={tasks}
      initialProjects={projects}
      currentUserId={user.id}
    />
  );
}
