"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useArrayToggle } from "@/hooks/use-array-toggle";
import { ChevronDown, Search, X } from "lucide-react";

interface RecordingsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedProjectIds: string[];
  onProjectIdsChange: (projectIds: string[]) => void;
  projects: Array<{ id: string; name: string }>;
  onClearFilters: () => void;
}

export function RecordingsFilters({
  searchQuery,
  onSearchChange,
  selectedProjectIds,
  onProjectIdsChange,
  projects,
  onClearFilters,
}: RecordingsFiltersProps) {
  const toggleProject = useArrayToggle(selectedProjectIds, onProjectIdsChange);

  const hasActiveFilters =
    selectedProjectIds.length > 0 || searchQuery.length > 0;

  const buttonText =
    selectedProjectIds.length === 0
      ? "All Projects"
      : selectedProjectIds.length === 1
      ? projects.find((p) => p.id === selectedProjectIds[0])?.name ??
        "1 project"
      : `${selectedProjectIds.length} projects`;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          {hasActiveFilters && (
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
        {/* Search */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Search</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => onSearchChange("")}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Projects
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="text-sm">{buttonText}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Select Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.map((project) => (
                  <DropdownMenuCheckboxItem
                    key={project.id}
                    checked={selectedProjectIds.includes(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  >
                    <span className="truncate">{project.name}</span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

