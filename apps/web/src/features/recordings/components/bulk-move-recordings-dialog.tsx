"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecordingDto } from "@/server/dto";
import { AlertCircleIcon, CheckCircleIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useBulkMoveRecordingsMutation } from "../hooks/use-bulk-move-recordings-mutation";
import { useProjectsForMove } from "../hooks/use-projects-for-move";

interface BulkMoveRecordingsDialogProps {
  recordings: RecordingDto[];
  currentProjectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface MoveResult {
  recordingId: string;
  recordingTitle: string;
  success: boolean;
  error?: string;
}

export function BulkMoveRecordingsDialog({
  recordings,
  currentProjectId,
  open,
  onOpenChange,
  onComplete,
}: BulkMoveRecordingsDialogProps) {
  const [targetProjectId, setTargetProjectId] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<MoveResult[]>([]);

  // Fetch projects when dialog opens
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useProjectsForMove({
    enabled: open,
    currentProjectId,
  });

  // Show error toast if projects fail to load
  if (projectsError) {
    toast.error("Failed to load projects");
  }

  // Bulk move recordings mutation
  const { moveRecordings, isMoving, progress } =
    useBulkMoveRecordingsMutation({
      onSuccess: (moveResults) => {
        setResults(moveResults);
        setShowResults(true);
      },
    });

  const handleMove = async () => {
    if (!targetProjectId) {
      toast.error("Please select a target project");
      return;
    }

    const recordingsToMove = recordings.map((r) => ({
      id: r.id,
      title: r.title,
    }));

    await moveRecordings(recordingsToMove, targetProjectId);
  };

  const handleClose = () => {
    if (isMoving) {
      return; // Don't allow closing during operation
    }

    // Reset state
    setTargetProjectId("");
    setShowResults(false);
    setResults([]);
    onOpenChange(false);
    
    if (showResults) {
      onComplete?.();
    }
  };

  const selectedProject = projects?.find((p) => p.id === targetProjectId);
  const progressPercentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => {
        if (isMoving) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>
            {showResults ? "Move Results" : "Move Multiple Recordings"}
          </DialogTitle>
          <DialogDescription>
            {showResults
              ? `Move operation completed`
              : `Move ${recordings.length} recording${recordings.length > 1 ? "s" : ""} to another project. All related data including embeddings will be updated.`}
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {recordings.length} recording{recordings.length > 1 ? "s" : ""}{" "}
                  selected
                </label>
                <div className="rounded-lg border p-3 bg-muted/50 max-h-32 overflow-y-auto">
                  <ul className="text-sm space-y-1">
                    {recordings.map((recording) => (
                      <li key={recording.id} className="truncate">
                        • {recording.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Target Project
                </label>
                <Select
                  value={targetProjectId}
                  onValueChange={setTargetProjectId}
                  disabled={isLoadingProjects || isMoving}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        isLoadingProjects
                          ? "Loading projects..."
                          : "Select a project"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.length === 0 && !isLoadingProjects ? (
                      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                        No other projects available
                      </div>
                    ) : (
                      projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <FolderIcon className="h-4 w-4" />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && (
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    The recordings will be moved to{" "}
                    <span className="font-medium text-foreground">
                      {selectedProject.name}
                    </span>
                    . All related data including chat embeddings will be
                    updated.
                  </p>
                </div>
              )}

              {isMoving && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Moving {progress.current} of {progress.total}{" "}
                      recordings...
                    </span>
                    <span className="font-medium">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✓ {progress.succeeded} succeeded</span>
                    {progress.failed > 0 && (
                      <span className="text-destructive">
                        ✗ {progress.failed} failed
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isMoving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMove}
                disabled={!targetProjectId || isMoving || isLoadingProjects}
              >
                {isMoving
                  ? `Moving... (${progress.current}/${progress.total})`
                  : `Move ${recordings.length} Recording${recordings.length > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium">
                      {successCount} recording{successCount !== 1 ? "s" : ""}{" "}
                      moved successfully
                    </p>
                    {failureCount > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {failureCount} recording{failureCount !== 1 ? "s" : ""}{" "}
                        failed
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {failureCount > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-destructive">
                    Failed Recordings:
                  </label>
                  <div className="rounded-lg border border-destructive/20 p-3 bg-destructive/5 max-h-48 overflow-y-auto">
                    <ul className="text-sm space-y-2">
                      {results
                        .filter((r) => !r.success)
                        .map((result) => (
                          <li
                            key={result.recordingId}
                            className="flex items-start gap-2"
                          >
                            <AlertCircleIcon className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">
                                {result.recordingTitle}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {result.error || "Unknown error"}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}

              {successCount > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-green-600 dark:text-green-500">
                    Successfully Moved:
                  </label>
                  <div className="rounded-lg border p-3 bg-muted/50 max-h-48 overflow-y-auto">
                    <ul className="text-sm space-y-1">
                      {results
                        .filter((r) => r.success)
                        .map((result) => (
                          <li key={result.recordingId} className="truncate">
                            ✓ {result.recordingTitle}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

