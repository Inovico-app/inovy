import {
  CheckCircle2Icon,
  FolderIcon,
  ListTodoIcon,
  MicIcon,
} from "lucide-react";
import Link from "next/link";

import type { TaskStatsDto } from "@/server/dto/task.dto";

interface DashboardStatsProps {
  totalProjects: number;
  totalRecordings: number;
  taskStats: TaskStatsDto | null;
}

export function DashboardStats({
  totalProjects,
  totalRecordings,
  taskStats,
}: DashboardStatsProps) {
  const pendingTasks = taskStats
    ? taskStats.byStatus.pending + taskStats.byStatus.in_progress
    : 0;
  const completedTasks = taskStats ? taskStats.byStatus.completed : 0;

  const tiles = [
    {
      label: "Projects",
      value: totalProjects,
      icon: FolderIcon,
      href: "/projects",
    },
    {
      label: "Recordings",
      value: totalRecordings,
      href: "/recordings",
      icon: MicIcon,
    },
    {
      label: "Pending",
      value: pendingTasks,
      href: "/tasks",
      icon: ListTodoIcon,
    },
    {
      label: "Completed",
      value: completedTasks,
      href: "/tasks",
      icon: CheckCircle2Icon,
    },
  ] as const;

  return (
    <section aria-label="Overview statistics">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <tile.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p
                className="text-2xl font-semibold leading-none tracking-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {tile.value}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {tile.label}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
