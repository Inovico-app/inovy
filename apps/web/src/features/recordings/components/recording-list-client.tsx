"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { ArrowRightIcon, CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { BulkMoveRecordingsDialog } from "./bulk-move-recordings-dialog";
import { RecordingCardWithStatus } from "./recording-card-with-status";
import { useTranslations } from "next-intl";

interface RecordingListClientProps {
  recordings: RecordingDto[];
  projectId: string;
}

export function RecordingListClient({
  recordings,
  projectId,
}: RecordingListClientProps) {
  const t = useTranslations("recordings");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<Set<string>>(
    new Set(),
  );
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);

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
    if (selectedRecordingIds.size === recordings.length) {
      // Deselect all
      setSelectedRecordingIds(new Set());
    } else {
      // Select all
      setSelectedRecordingIds(new Set(recordings.map((r) => r.id)));
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

  const selectedRecordings = recordings.filter((r) =>
    selectedRecordingIds.has(r.id),
  );

  const allSelected =
    recordings.length > 0 && selectedRecordingIds.size === recordings.length;
  const someSelected = selectedRecordingIds.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
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
              {t("selection.cancelSelection")}
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-2" />
              {t("selection.selectMultiple")}
            </>
          )}
        </Button>

        {selectionMode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("selection.selectedOf", {
                selected: selectedRecordingIds.size,
                total: recordings.length,
              })}
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
                className={
                  someSelected ? "data-[state=checked]:bg-primary/50" : ""
                }
              />
              <span className="text-sm font-medium">
                {allSelected
                  ? t("selection.deselectAll")
                  : t("selection.selectAll")}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              {t("selection.recordingsSelected", {
                count: selectedRecordingIds.size,
              })}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowBulkMoveDialog(true)}
            disabled={selectedRecordingIds.size === 0}
          >
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            {t("selection.moveSelected")}
          </Button>
        </div>
      )}

      {/* Recordings List */}
      <div className="space-y-4">
        {recordings.map((recording) => (
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
    </div>
  );
}
