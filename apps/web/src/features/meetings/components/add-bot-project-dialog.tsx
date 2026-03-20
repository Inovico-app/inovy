"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AddBotProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (projectId: string) => void;
  meetingTitle?: string;
  projects: Array<{ id: string; name: string }>;
  defaultProjectId?: string;
  isLoadingProjects?: boolean;
}

/**
 * Project selection dialog for adding a bot to a meeting
 * Allows users to select which project the recording will be saved to
 */
export function AddBotProjectDialog({
  open,
  onOpenChange,
  onAccept,
  meetingTitle,
  projects,
  defaultProjectId,
  isLoadingProjects,
}: AddBotProjectDialogProps) {
  const projectItems = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId ?? "",
  );
  const prevOpenRef = useRef(open);
  const prevDefaultProjectIdRef = useRef(defaultProjectId);

  // Reset selected project when dialog opens or defaultProjectId changes (during render)
  if (
    (open && !prevOpenRef.current && defaultProjectId) ||
    (open &&
      defaultProjectId &&
      defaultProjectId !== prevDefaultProjectIdRef.current)
  ) {
    setSelectedProjectId(defaultProjectId);
  }
  prevOpenRef.current = open;
  prevDefaultProjectIdRef.current = defaultProjectId;

  const handleAccept = () => {
    if (!selectedProjectId) {
      return;
    }
    onAccept(selectedProjectId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Notetaker Assistant</DialogTitle>
          <DialogDescription>
            {meetingTitle
              ? `Add a notetaker assistant to "${meetingTitle}"?`
              : "Add a notetaker assistant to this meeting?"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-select">Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={(value) => setSelectedProjectId(value ?? "")}
              disabled={isLoadingProjects || projects.length === 0}
              items={projectItems}
            >
              <SelectTrigger id="project-select">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && !isLoadingProjects && (
              <p className="text-sm text-destructive">
                No active projects found. Please create a project first.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={!selectedProjectId}>
            Add Notetaker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
