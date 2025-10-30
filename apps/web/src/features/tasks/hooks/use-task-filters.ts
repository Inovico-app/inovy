"use client";

import type { TaskPriority, TaskStatus } from "@/server/db/schema/tasks";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { SortField, SortOrder } from "../components/task-sort";

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
const VALID_STATUSES: TaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];
const VALID_SORT_FIELDS: SortField[] = [
  "priority",
  "dueDate",
  "createdAt",
  "project",
];
const VALID_SORT_ORDERS: SortOrder[] = ["asc", "desc"];

const DEFAULT_STATUSES: TaskStatus[] = ["pending", "in_progress"];
const DEFAULT_SORT_BY: SortField = "priority";
const DEFAULT_SORT_ORDER: SortOrder = "desc";

interface UseTaskFiltersReturn {
  selectedPriorities: TaskPriority[];
  selectedStatuses: TaskStatus[];
  selectedProjectIds: string[];
  sortBy: SortField;
  sortOrder: SortOrder;
  searchQuery: string;
  handlePrioritiesChange: (priorities: TaskPriority[]) => void;
  handleStatusesChange: (statuses: TaskStatus[]) => void;
  handleProjectIdsChange: (projectIds: string[]) => void;
  handleSortChange: (sortBy: SortField, sortOrder: SortOrder) => void;
  handleSearchChange: (value: string) => void;
  handleClearFilters: () => void;
}

export function useTaskFilters(): UseTaskFiltersReturn {
  const [filters, setFilters] = useQueryStates({
    priorities: parseAsArrayOf(parseAsString).withDefault([]),
    statuses: parseAsArrayOf(parseAsString).withDefault(DEFAULT_STATUSES),
    projectIds: parseAsArrayOf(parseAsString).withDefault([]),
    sortBy: parseAsString.withDefault(DEFAULT_SORT_BY),
    sortOrder: parseAsString.withDefault(DEFAULT_SORT_ORDER),
    search: parseAsString.withDefault(""),
  });

  // Parse and validate filters
  const selectedPriorities = useMemo(
    () =>
      filters.priorities.filter((p): p is TaskPriority =>
        VALID_PRIORITIES.includes(p as TaskPriority)
      ),
    [filters.priorities]
  );

  const selectedStatuses = useMemo(
    () =>
      filters.statuses.filter((s): s is TaskStatus =>
        VALID_STATUSES.includes(s as TaskStatus)
      ),
    [filters.statuses]
  );

  const sortBy = useMemo(
    () =>
      (VALID_SORT_FIELDS.includes(filters.sortBy as SortField)
        ? filters.sortBy
        : DEFAULT_SORT_BY) as SortField,
    [filters.sortBy]
  );

  const sortOrder = useMemo(
    () =>
      (VALID_SORT_ORDERS.includes(filters.sortOrder as SortOrder)
        ? filters.sortOrder
        : DEFAULT_SORT_ORDER) as SortOrder,
    [filters.sortOrder]
  );

  return {
    selectedPriorities,
    selectedStatuses,
    selectedProjectIds: filters.projectIds,
    sortBy,
    sortOrder,
    searchQuery: filters.search.trim(),
    handlePrioritiesChange: (priorities) => {
      void setFilters({ priorities });
    },
    handleStatusesChange: (statuses) => {
      void setFilters({ statuses });
    },
    handleProjectIdsChange: (projectIds) => {
      void setFilters({ projectIds });
    },
    handleSortChange: (newSortBy, newSortOrder) => {
      void setFilters({ sortBy: newSortBy, sortOrder: newSortOrder });
    },
    handleSearchChange: (value) => {
      void setFilters({ search: value });
    },
    handleClearFilters: () => {
      void setFilters({
        priorities: [],
        statuses: DEFAULT_STATUSES,
        projectIds: [],
        search: "",
      });
    },
  };
}

