"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { TaskPriority } from "@/server/db/schema/tasks";

interface TaskFiltersProps {
  selectedPriorities: TaskPriority[];
  onPrioritiesChange: (priorities: TaskPriority[]) => void;
  taskCounts?: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  onClearFilters?: () => void;
}

const priorityOptions: Array<{
  value: TaskPriority;
  label: string;
  color: string;
}> = [
  { value: "urgent", label: "Urgent", color: "text-red-700 dark:text-red-400" },
  { value: "high", label: "High", color: "text-orange-700 dark:text-orange-400" },
  { value: "medium", label: "Medium", color: "text-blue-700 dark:text-blue-400" },
  { value: "low", label: "Low", color: "text-slate-700 dark:text-slate-400" },
];

export function TaskFilters({
  selectedPriorities,
  onPrioritiesChange,
  taskCounts,
  onClearFilters,
}: TaskFiltersProps) {
  const handlePriorityToggle = (priority: TaskPriority) => {
    if (selectedPriorities.includes(priority)) {
      onPrioritiesChange(selectedPriorities.filter((p) => p !== priority));
    } else {
      onPrioritiesChange([...selectedPriorities, priority]);
    }
  };

  const hasActiveFilters = selectedPriorities.length > 0;

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
          <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
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
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs"
                      >
                        {count}
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

