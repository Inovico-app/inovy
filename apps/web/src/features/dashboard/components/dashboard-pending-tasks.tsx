import { TaskCard } from "@/features/tasks/components/task-card";
import type { TaskWithContextDto } from "@/server/dto/task.dto";
import { ListTodoIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

interface DashboardPendingTasksProps {
  tasks: TaskWithContextDto[];
}

async function EmptyState() {
  const t = await getTranslations("dashboard");

  return (
    <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <ListTodoIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{t("noPendingTasks")}</p>
    </div>
  );
}

export async function DashboardPendingTasks({
  tasks,
}: DashboardPendingTasksProps) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  return (
    <section aria-label={t("pendingTasks")}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("pendingTasksTitle")}
        </h2>
        {tasks.length > 0 && (
          <Link
            href="/tasks"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {tCommon("viewAll")}
          </Link>
        )}
      </div>
      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showContext />
          ))}
        </div>
      )}
    </section>
  );
}
