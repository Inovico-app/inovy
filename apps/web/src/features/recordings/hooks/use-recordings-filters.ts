"use client";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

const VALID_STATUSES = ["active", "archived"] as const;
const VALID_VIEW_MODES = ["grouped", "flat"] as const;

type StatusFilter = (typeof VALID_STATUSES)[number];
type ViewMode = (typeof VALID_VIEW_MODES)[number];

const DEFAULT_STATUS: StatusFilter = "active";
const DEFAULT_VIEW_MODE: ViewMode = "flat";

interface UseRecordingsFiltersReturn {
  statusFilter: StatusFilter;
  searchQuery: string;
  selectedProjectIds: string[];
  viewMode: ViewMode;
  handleStatusChange: (status: StatusFilter) => void;
  handleSearchChange: (value: string) => void;
  handleProjectIdsChange: (projectIds: string[]) => void;
  handleViewModeChange: (view: ViewMode) => void;
  handleClearFilters: () => void;
}

export function useRecordingsFilters(): UseRecordingsFiltersReturn {
  const [filters, setFilters] = useQueryStates({
    status: parseAsString.withDefault(DEFAULT_STATUS),
    search: parseAsString.withDefault(""),
    projects: parseAsArrayOf(parseAsString).withDefault([]),
    view: parseAsString.withDefault(DEFAULT_VIEW_MODE),
  });

  // Parse and validate filters
  const statusFilter = (
    VALID_STATUSES.includes(filters.status as StatusFilter)
      ? filters.status
      : DEFAULT_STATUS
  ) as StatusFilter;

  const viewMode = (
    VALID_VIEW_MODES.includes(filters.view as ViewMode)
      ? filters.view
      : DEFAULT_VIEW_MODE
  ) as ViewMode;

  return {
    statusFilter,
    searchQuery: filters.search.trim(),
    selectedProjectIds: filters.projects,
    viewMode,
    handleStatusChange: (status) => {
      void setFilters({ status });
    },
    handleSearchChange: (value) => {
      void setFilters({ search: value });
    },
    handleProjectIdsChange: (projectIds) => {
      void setFilters({ projects: projectIds });
    },
    handleViewModeChange: (view) => {
      void setFilters({ view });
    },
    handleClearFilters: () => {
      void setFilters({
        status: DEFAULT_STATUS,
        search: "",
        projects: [],
        view: DEFAULT_VIEW_MODE,
      });
    },
  };
}

