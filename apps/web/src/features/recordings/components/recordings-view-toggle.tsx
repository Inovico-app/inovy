"use client";

import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

type ViewMode = "grouped" | "flat";

interface RecordingsViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (view: ViewMode) => void;
}

export function RecordingsViewToggle({
  viewMode,
  onViewModeChange,
}: RecordingsViewToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={viewMode === "flat" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewModeChange("flat")}
        className="gap-2"
      >
        <List className="h-4 w-4" />
        Flat List
      </Button>
      <Button
        variant={viewMode === "grouped" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewModeChange("grouped")}
        className="gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        Grouped by Project
      </Button>
    </div>
  );
}

