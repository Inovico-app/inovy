"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";
import { X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const priorityOptions: Array<{
  value: TaskPriority;
  label: string;
  color: string;
}> = [
  { value: "urgent", label: "Urgent", color: "text-red-700 dark:text-red-400" },
  {
    value: "high",
    label: "High",
    color: "text-orange-700 dark:text-orange-400",
  },
  {
    value: "medium",
    label: "Medium",
    color: "text-blue-700 dark:text-blue-400",
  },
  { value: "low", label: "Low", color: "text-slate-700 dark:text-slate-400" },
];

const statusOptions: Array<{
  value: TaskStatus;
  label: string;
}> = [
  { value: "pending", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
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
  const handlePriorityToggle = (priority: TaskPriority) => {
    if (selectedPriorities.includes(priority)) {
      onPrioritiesChange(selectedPriorities.filter((p) => p !== priority));
    } else {
      onPrioritiesChange([...selectedPriorities, priority]);
    }
  };

  const handleStatusToggle = (status: TaskStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusesChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusesChange([...selectedStatuses, status]);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    if (selectedProjectIds.includes(projectId)) {
      onProjectIdsChange(selectedProjectIds.filter((id) => id !== projectId));
    } else {
      onProjectIdsChange([...selectedProjectIds, projectId]);
    }
  };

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
        {/* Priority Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Priority
          </h3>
          <div className="space-y-2">
            {priorityOptions.map((option) => {
              const count = taskCounts?.[option.value] ?? 0;
              const isChecked = selectedPriorities.includes(option.value);

              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`priority-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={() => handlePriorityToggle(option.value)}
                  />
                  <Label
                    htmlFor={`priority-${option.value}`}
                    className="flex items-center gap-2 text-sm font-normal cursor-pointer flex-1"
                  >
                    <span className={option.color}>{option.label}</span>
                    {taskCounts && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {count}
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <div className="space-y-2">
            {statusOptions.map((option) => {
              const count = statusCounts?.[option.value] ?? 0;
              const isChecked = selectedStatuses.includes(option.value);

              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="flex items-center gap-2 text-sm font-normal cursor-pointer flex-1"
                  >
                    <span>{option.label}</span>
                    {statusCounts && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {count}
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Filter */}
        {projects && projects.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Projects
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="text-sm">
                    {selectedProjectIds.length === 0
                      ? "All Projects"
                      : selectedProjectIds.length === 1
                        ? projects.find((p) => p.id === selectedProjectIds[0])
                            ?.name
                        : `${selectedProjectIds.length} projects`}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Select Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((project) => {
                  const isChecked = selectedProjectIds.includes(project.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={project.id}
                      checked={isChecked}
                      onCheckedChange={() => handleProjectToggle(project.id)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{project.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {project.taskCount}
                        </Badge>
                      </div>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

