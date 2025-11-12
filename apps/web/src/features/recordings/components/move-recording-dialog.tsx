"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecordingDto } from "@/server/dto";
import { ArrowRightIcon, FolderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useMoveRecordingMutation } from "../hooks/use-move-recording-mutation";
import { useProjectsForMove } from "../hooks/use-projects-for-move";

interface MoveRecordingDialogProps {
  recording: RecordingDto;
  currentProjectId: string;
  variant?: "default" | "outline" | "ghost";
  triggerContent?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MoveRecordingDialog({
  recording,
  currentProjectId,
  variant = "ghost",
  triggerContent,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: MoveRecordingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [targetProjectId, setTargetProjectId] = useState<string>("");

  // Use controlled or uncontrolled state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

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

  // Move recording mutation
  const { moveRecording, isMoving } = useMoveRecordingMutation({
    onSuccess: () => {
      setOpen(false);
      setTargetProjectId("");
    },
  });

  const handleMove = () => {
    if (!targetProjectId) {
      toast.error("Please select a target project");
      return;
    }

    moveRecording({
      recordingId: recording.id,
      targetProjectId,
    });
  };

  const selectedProject = projects?.find((p) => p.id === targetProjectId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerContent || (
          <Button variant={variant} size="sm">
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            Move
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Move Recording</DialogTitle>
          <DialogDescription>
            Move "{recording.title}" to another project. This will update all
            related data including embeddings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Target Project</label>
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
                The recording will be moved to{" "}
                <span className="font-medium text-foreground">
                  {selectedProject.name}
                </span>
                . All related data including chat embeddings will be updated.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!targetProjectId || isMoving || isLoadingProjects}
          >
            {isMoving ? "Moving..." : "Move Recording"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

