import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskStatus } from "@/server/db/schema/tasks";
import type { TaskWithContextDto } from "@/server/dto";
import { TaskCard } from "./task-card";
import { TaskListEmpty } from "./task-list-empty";
import { TaskSearch } from "./task-search";
import { TaskSort, type SortField, type SortOrder } from "./task-sort";

interface TaskListContentProps {
  tasks: TaskWithContextDto[];
  totalPending: number;
  sortBy: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  onSortChange: (sortBy: SortField, sortOrder: SortOrder) => void;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export function TaskListContent({
  tasks,
  totalPending,
  sortBy,
  sortOrder,
  searchQuery,
  onSortChange,
  onSearchChange,
  onClearFilters,
  onStatusChange,
}: TaskListContentProps) {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <TaskSearch
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search by title, description, project, or recording..."
      />

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
            <TaskSort
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={onSortChange}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {tasks.length === 0 ? (
            <TaskListEmpty
              variant="no-results"
              onClearFilters={onClearFilters}
            />
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                showContext
                onStatusChange={onStatusChange}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

