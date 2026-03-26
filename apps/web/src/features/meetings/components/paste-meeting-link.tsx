"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidMeetingUrl } from "@/lib/meeting-url";
import { useUserProjects } from "@/features/projects/hooks/use-user-projects";
import { LinkIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useAddNotetakerByUrl } from "../hooks/use-add-notetaker-by-url";

export function PasteMeetingLink() {
  const t = useTranslations("meetings");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const {
    projects,
    isLoadingProjects,
    defaultProjectId,
    hasOnlyOneProject,
    setLastUsedProjectId,
  } = useUserProjects();

  const { execute, isExecuting } = useAddNotetakerByUrl({
    onSuccess: () => {
      setMeetingUrl("");
      setHasAttemptedSubmit(false);
    },
  });

  const projectItems = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const effectiveProjectId = selectedProjectId || defaultProjectId || "";
  const hasInput = meetingUrl.trim() !== "";
  const isValidUrl = hasInput && isValidMeetingUrl(meetingUrl);
  const showUrlError = hasAttemptedSubmit && hasInput && !isValidUrl;
  const canSubmit = isValidUrl && effectiveProjectId && !isExecuting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    if (!canSubmit) return;

    setLastUsedProjectId(effectiveProjectId);
    execute({
      meetingUrl: meetingUrl.trim(),
      projectId: effectiveProjectId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="url"
            placeholder={t("pasteMeetingLink.placeholder")}
            value={meetingUrl}
            onChange={(e) => {
              setMeetingUrl(e.target.value);
              if (hasAttemptedSubmit) setHasAttemptedSubmit(false);
            }}
            className="pl-9"
            disabled={isExecuting}
            aria-label={t("pasteMeetingLink.meetingUrlAriaLabel")}
            aria-invalid={showUrlError}
            aria-describedby={showUrlError ? "meeting-url-error" : undefined}
          />
        </div>
        {!hasOnlyOneProject && projects.length > 1 && (
          <Select
            value={effectiveProjectId}
            onValueChange={(value) => setSelectedProjectId(value ?? "")}
            disabled={isLoadingProjects || isExecuting}
            items={projectItems}
            aria-label={t("pasteMeetingLink.projectAriaLabel")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue
                placeholder={t("pasteMeetingLink.projectPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="submit" disabled={!canSubmit} size="default">
          {isExecuting ? (
            <>
              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              {t("pasteMeetingLink.adding")}
            </>
          ) : (
            t("pasteMeetingLink.addNotetaker")
          )}
        </Button>
      </div>
      {showUrlError && (
        <p
          id="meeting-url-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {t("pasteMeetingLink.invalidUrl")}
        </p>
      )}
    </form>
  );
}
