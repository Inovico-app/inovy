import { DashboardGetStarted } from "@/features/dashboard/components/dashboard-get-started";
import type { Metadata } from "next";
import { DashboardGreeting } from "@/features/dashboard/components/dashboard-greeting";
import { DashboardPendingTasks } from "@/features/dashboard/components/dashboard-pending-tasks";
import { DashboardRecentRecordings } from "@/features/dashboard/components/dashboard-recent-recordings";
import { DashboardStats } from "@/features/dashboard/components/dashboard-stats";
import { DashboardUpcomingMeetings } from "@/features/dashboard/components/dashboard-upcoming-meetings";
import { filterTasksByStatus } from "@/lib/filters/task-filters";
import { permissions } from "@/lib/permissions/engine";
import { requirePermission } from "@/lib/permissions/require-permission";
import { getCachedBotSessionsByCalendarEventIds } from "@/server/cache/bot-sessions.cache";
import { getCachedCalendarMeetings } from "@/server/cache/calendar-meetings.cache";
import { getCachedDashboardOverview } from "@/server/cache/dashboard.cache";
import {
  getCachedTaskStats,
  getCachedTasksWithContext,
} from "@/server/cache/task.cache";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Dashboard" };

async function DashboardContent() {
  const t = await getTranslations("dashboard");
  const { user, organizationId, userTeamIds } = await requirePermission(
    permissions.hasRole("viewer"),
  );
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [dashboardStats, taskStats, recentTasks, upcomingMeetings] =
    await Promise.all([
      getCachedDashboardOverview(organizationId, {
        userTeamIds,
        user,
      }),
      getCachedTaskStats(user.id, organizationId),
      getCachedTasksWithContext(user.id, organizationId, undefined, {
        user,
        userTeamIds,
      }),
      getCachedCalendarMeetings(user.id, organizationId, now, endOfDay).catch(
        () => [],
      ),
    ]);

  // Fetch bot sessions for today's meetings to show notetaker status
  const calendarEventIds = upcomingMeetings.map((m) => m.id);
  const botSessionsMap =
    calendarEventIds.length > 0
      ? await getCachedBotSessionsByCalendarEventIds(
          calendarEventIds,
          organizationId,
        ).catch(() => new Map())
      : new Map();

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
          userName={user.name ?? user.email ?? "there"}
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
        <DashboardUpcomingMeetings
          meetings={upcomingMeetings}
          botSessionsMap={Object.fromEntries(botSessionsMap)}
          now={now.getTime()}
        />

        {/* Tasks and recordings side by side */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <DashboardPendingTasks tasks={filteredTasks} />
          <DashboardRecentRecordings
            recordings={dashboardStats?.recentRecordings ?? []}
          />
        </div>
      </div>

      {isNewUser && <DashboardGetStarted />}
    </div>
  );
}

export default async function Home() {
  return <DashboardContent />;
}
