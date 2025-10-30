import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserTasks } from "../actions/get-user-tasks";
import { TaskCard } from "./task-card";

export async function GlobalTaskList() {
  const result = await getUserTasks();

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {result.error ?? "Failed to load tasks"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tasks = result.data;

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No tasks assigned to you yet. Tasks will appear here once they are
            extracted from your recordings.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group tasks by priority for better organization
  const tasksByPriority = {
    urgent: tasks.filter((t) => t.priority === "urgent"),
    high: tasks.filter((t) => t.priority === "high"),
    medium: tasks.filter((t) => t.priority === "medium"),
    low: tasks.filter((t) => t.priority === "low"),
  };

  const totalPending = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>My Tasks</CardTitle>
            <Badge variant="outline">{tasks.length}</Badge>
            {totalPending > 0 && (
              <Badge variant="secondary">{totalPending} pending</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Urgent tasks */}
        {tasksByPriority.urgent.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
              Urgent ({tasksByPriority.urgent.length})
            </h3>
            <div className="space-y-2">
              {tasksByPriority.urgent.map((task) => (
                <TaskCard key={task.id} task={task} showContext />
              ))}
            </div>
          </div>
        )}

        {/* High priority tasks */}
        {tasksByPriority.high.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              High Priority ({tasksByPriority.high.length})
            </h3>
            <div className="space-y-2">
              {tasksByPriority.high.map((task) => (
                <TaskCard key={task.id} task={task} showContext />
              ))}
            </div>
          </div>
        )}

        {/* Medium priority tasks */}
        {tasksByPriority.medium.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              Medium Priority ({tasksByPriority.medium.length})
            </h3>
            <div className="space-y-2">
              {tasksByPriority.medium.map((task) => (
                <TaskCard key={task.id} task={task} showContext />
              ))}
            </div>
          </div>
        )}

        {/* Low priority tasks */}
        {tasksByPriority.low.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-400">
              Low Priority ({tasksByPriority.low.length})
            </h3>
            <div className="space-y-2">
              {tasksByPriority.low.map((task) => (
                <TaskCard key={task.id} task={task} showContext />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

