"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { BulkMoveRecordingsDialog } from "./bulk-move-recordings-dialog";
import { RecordingCardWithStatus } from "./recording-card-with-status";

interface RecordingListClientProps {
  recordings: RecordingDto[];
  projectId: string;
  searchQuery?: string;
}

export function RecordingListClient({
  recordings,
  projectId,
  searchQuery,
}: RecordingListClientProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<Set<string>>(
    new Set()
  );
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);

  // Filter recordings based on search query (client-side)
  const filteredRecordings = searchQuery
    ? recordings.filter((recording) =>
        recording.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recordings;

  const handleSelectionChange = (recordingId: string, selected: boolean) => {
    const newSelection = new Set(selectedRecordingIds);
    if (selected) {
      newSelection.add(recordingId);
    } else {
      newSelection.delete(recordingId);
    }
    setSelectedRecordingIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedRecordingIds.size === filteredRecordings.length) {
      // Deselect all
      setSelectedRecordingIds(new Set());
    } else {
      // Select all
      setSelectedRecordingIds(new Set(filteredRecordings.map((r) => r.id)));
    }
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedRecordingIds(new Set());
  };

  const handleBulkMoveComplete = () => {
    setSelectionMode(false);
    setSelectedRecordingIds(new Set());
    setShowBulkMoveDialog(false);
  };

  const selectedRecordings = filteredRecordings.filter((r) =>
    selectedRecordingIds.has(r.id)
  );

  const allSelected = filteredRecordings.length > 0 && selectedRecordingIds.size === filteredRecordings.length;
  const someSelected = selectedRecordingIds.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
      {/* Show empty state if filtered results are empty */}
      {filteredRecordings.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No recordings found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      ) : (
        <>
          {/* Selection Mode Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={handleToggleSelectionMode}
            >
              {selectionMode ? (
                <>
                  <XIcon className="h-4 w-4 mr-2" />
                  Cancel Selection
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Select Multiple
                </>
              )}
            </Button>

            {selectionMode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedRecordingIds.size} of {filteredRecordings.length} selected
                </span>
              </div>
            )}
          </div>

          {/* Bulk Actions Toolbar */}
          {selectionMode && selectedRecordingIds.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                  <span className="text-sm font-medium">
                    {allSelected
                      ? "Deselect All"
                      : someSelected
                        ? "Select All"
                        : "Select All"}
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  {selectedRecordingIds.size} recording
                  {selectedRecordingIds.size !== 1 ? "s" : ""} selected
                </span>
              </div>
              <Button
                size="sm"
                onClick={() => setShowBulkMoveDialog(true)}
                disabled={selectedRecordingIds.size === 0}
              >
                <ArrowRightIcon className="h-4 w-4 mr-2" />
                Move Selected
              </Button>
            </div>
          )}

          {/* Recordings List */}
          <div className="space-y-4">
            {filteredRecordings.map((recording) => (
              <RecordingCardWithStatus
                key={recording.id}
                recording={recording}
                selectable={selectionMode}
                isSelected={selectedRecordingIds.has(recording.id)}
                onSelectionChange={handleSelectionChange}
              />
            ))}
          </div>

          {/* Bulk Move Dialog */}
          <BulkMoveRecordingsDialog
            recordings={selectedRecordings}
            currentProjectId={projectId}
            open={showBulkMoveDialog}
            onOpenChange={setShowBulkMoveDialog}
            onComplete={handleBulkMoveComplete}
          />
        </>
      )}
    </div>
  );
}

