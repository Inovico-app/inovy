"use client";

import { isValidElement } from "react";
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
import type { RecordingDto } from "@/server/dto/recording.dto";
import { ArrowRightIcon, FolderIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useMoveRecordingMutation } from "../hooks/use-move-recording-mutation";
import { useProjectsForMove } from "../hooks/use-projects-for-move";
import { useTranslations } from "next-intl";

interface MoveRecordingDialogProps {
  recording: RecordingDto;
  currentProjectId: string;
  variant?: "default" | "outline" | "ghost";
  triggerContent?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function MoveRecordingDialog({
  recording,
  currentProjectId,
  variant = "ghost",
  triggerContent,
  onOpenChange,
}: MoveRecordingDialogProps) {
  const t = useTranslations("recordings");
  const [targetProjectId, setTargetProjectId] = useState<string>("");

  // Fetch projects when dialog opens
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useProjectsForMove({
    enabled: true,
    currentProjectId,
  });

  const projectItems = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  // Show error toast if projects fail to load
  if (projectsError) {
    toast.error(t("actions.failedToLoadProjects"));
  }

  // Move recording mutation
  const { moveRecording, isMoving } = useMoveRecordingMutation({
    onSuccess: () => {
      onOpenChange?.(false);
      setTargetProjectId("");
    },
  });

  const handleMove = () => {
    if (!targetProjectId) {
      toast.error(t("actions.selectTargetError"));
      return;
    }

    moveRecording({
      recordingId: recording.id,
      targetProjectId,
    });
  };

  const selectedProject = projects?.find((p) => p.id === targetProjectId);

  const triggerElement = isValidElement(triggerContent)
    ? triggerContent
    : undefined;
  return (
    <Dialog open>
      <DialogTrigger
        render={triggerElement ?? <Button variant={variant} size="sm" />}
      >
        {!triggerElement && (
          <>
            <ArrowRightIcon className="h-4 w-4 mr-2" />
            {t("actions.move")}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("actions.moveRecording")}</DialogTitle>
          <DialogDescription>
            {t("actions.moveDescription", { title: recording.title })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="move-target-project"
              className="text-sm font-medium"
            >
              {t("actions.selectTargetProject")}
            </label>
            <Select
              value={targetProjectId}
              onValueChange={(value) => setTargetProjectId(value ?? "")}
              disabled={isLoadingProjects || isMoving}
              items={projectItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingProjects
                      ? t("actions.loadingProjects")
                      : t("actions.selectProject")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects?.length === 0 && !isLoadingProjects ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    {t("actions.noOtherProjects")}
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
            onClick={() => onOpenChange?.(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!targetProjectId || isMoving || isLoadingProjects}
          >
            {isMoving ? t("actions.moving") : t("actions.moveRecordingButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
