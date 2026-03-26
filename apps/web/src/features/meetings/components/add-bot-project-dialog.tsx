"use client";

import { useEffect, useRef, useState } from "react";
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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId ?? "",
  );
  const prevOpenRef = useRef(open);
  const prevDefaultProjectIdRef = useRef(defaultProjectId);

  // Reset selected project when dialog opens or defaultProjectId changes
  useEffect(() => {
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
  }, [open, defaultProjectId]);

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
          <DialogTitle>{t("botDialog.title")}</DialogTitle>
          <DialogDescription>
            {meetingTitle
              ? t("botDialog.descriptionWithTitle", { title: meetingTitle })
              : t("botDialog.descriptionGeneric")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-select">
              {t("botDialog.projectLabel")}
            </Label>
            <Select
              value={selectedProjectId}
              onValueChange={(value) => setSelectedProjectId(value ?? "")}
              disabled={isLoadingProjects || projects.length === 0}
            >
              <SelectTrigger id="project-select">
                <SelectValue placeholder={t("botDialog.selectProject")} />
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
                {t("botDialog.noProjects")}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleAccept} disabled={!selectedProjectId}>
            {t("botDialog.addNotetaker")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
