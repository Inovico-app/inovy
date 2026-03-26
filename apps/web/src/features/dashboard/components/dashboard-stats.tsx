import {
  CheckCircle2Icon,
  FolderIcon,
  ListTodoIcon,
  MicIcon,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import type { TaskStatsDto } from "@/server/dto/task.dto";

interface DashboardStatsProps {
  totalProjects: number;
  totalRecordings: number;
  taskStats: TaskStatsDto | null;
}

export async function DashboardStats({
  totalProjects,
  totalRecordings,
  taskStats,
}: DashboardStatsProps) {
  const t = await getTranslations("dashboard");

  const pendingTasks = taskStats
    ? taskStats.byStatus.pending + taskStats.byStatus.in_progress
    : 0;
  const completedTasks = taskStats ? taskStats.byStatus.completed : 0;

  const tiles = [
    {
      label: t("projects"),
      value: totalProjects,
      icon: FolderIcon,
      href: "/projects",
    },
    {
      label: t("recordings"),
      value: totalRecordings,
      href: "/recordings",
      icon: MicIcon,
    },
    {
      label: t("pending"),
      value: pendingTasks,
      href: "/tasks",
      icon: ListTodoIcon,
    },
    {
      label: t("completed"),
      value: completedTasks,
      href: "/tasks",
      icon: CheckCircle2Icon,
    },
  ] as const;

  return (
    <section aria-label={t("overviewStatistics")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
