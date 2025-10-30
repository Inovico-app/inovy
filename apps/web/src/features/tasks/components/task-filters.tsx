"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";
import { X } from "lucide-react";
import { useArrayToggle } from "../hooks/use-array-toggle";
import { FilterCheckboxGroup } from "./filter-checkbox-group";
import { ProjectFilterDropdown } from "./project-filter-dropdown";

interface TaskFiltersProps {
  selectedPriorities: TaskPriority[];
  onPrioritiesChange: (priorities: TaskPriority[]) => void;
  selectedStatuses: TaskStatus[];
  onStatusesChange: (statuses: TaskStatus[]) => void;
  selectedProjectIds: string[];
  onProjectIdsChange: (projectIds: string[]) => void;
  taskCounts?: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  statusCounts?: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  projects?: Array<{ id: string; name: string; taskCount: number }>;
  onClearFilters?: () => void;
}

const PRIORITY_OPTIONS = [
  {
    value: "urgent" as const,
    label: "Urgent",
    color: "text-red-700 dark:text-red-400",
  },
  {
    value: "high" as const,
    label: "High",
    color: "text-orange-700 dark:text-orange-400",
  },
  {
    value: "medium" as const,
    label: "Medium",
    color: "text-blue-700 dark:text-blue-400",
  },
  {
    value: "low" as const,
    label: "Low",
    color: "text-slate-700 dark:text-slate-400",
  },
];

const STATUS_OPTIONS = [
  { value: "pending" as const, label: "To Do" },
  { value: "in_progress" as const, label: "In Progress" },
  { value: "completed" as const, label: "Completed" },
  { value: "cancelled" as const, label: "Cancelled" },
];

export function TaskFilters({
  selectedPriorities,
  onPrioritiesChange,
  selectedStatuses,
  onStatusesChange,
  selectedProjectIds,
  onProjectIdsChange,
  taskCounts,
  statusCounts,
  projects,
  onClearFilters,
}: TaskFiltersProps) {
  const togglePriority = useArrayToggle(selectedPriorities, onPrioritiesChange);
  const toggleStatus = useArrayToggle(selectedStatuses, onStatusesChange);
  const toggleProject = useArrayToggle(selectedProjectIds, onProjectIdsChange);

  const hasActiveFilters =
    selectedPriorities.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedProjectIds.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-8 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterCheckboxGroup
          title="Priority"
          options={PRIORITY_OPTIONS}
          selectedValues={selectedPriorities}
          onToggle={togglePriority}
          counts={taskCounts}
        />

        <FilterCheckboxGroup
          title="Status"
          options={STATUS_OPTIONS}
          selectedValues={selectedStatuses}
          onToggle={toggleStatus}
          counts={statusCounts}
        />

        {projects && projects.length > 0 && (
          <ProjectFilterDropdown
            projects={projects}
            selectedProjectIds={selectedProjectIds}
            onToggle={toggleProject}
          />
        )}
      </CardContent>
    </Card>
  );
}

