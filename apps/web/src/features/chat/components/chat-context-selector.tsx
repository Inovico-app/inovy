"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

interface Project {
  id: string;
  name: string;
}

interface ChatContextSelectorProps {
  currentContext: "organization" | "project";
  currentProjectId?: string;
  isAdmin: boolean;
  projects: Project[];
  onContextChange: (
    context: "organization" | "project",
    projectId?: string,
  ) => void;
}

export function ChatContextSelector({
  currentContext,
  currentProjectId,
  isAdmin,
  projects,
  onContextChange,
}: ChatContextSelectorProps) {
  const t = useTranslations("chat");

  const contextItems = useMemo(
    () => ({
      organization: t("organizationWide"),
      ...Object.fromEntries(projects.map((p) => [`project-${p.id}`, p.name])),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects],
  );

  const currentValue =
    currentContext === "organization"
      ? "organization"
      : `project-${currentProjectId}`;

  const handleValueChange = (value: string) => {
    if (value === "organization") {
      onContextChange("organization");
    } else if (value.startsWith("project-")) {
      const projectId = value.replace("project-", "");
      onContextChange("project", projectId);
    }
  };

  return (
    <Select
      value={currentValue}
      onValueChange={(value) => value && handleValueChange(value)}
      items={contextItems}
    >
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder={t("selectContext")} />
      </SelectTrigger>
      <SelectContent>
        {isAdmin && (
          <>
            <SelectItem value="organization">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{t("organizationWide")}</span>
              </div>
            </SelectItem>
            {projects.length > 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t my-1">
                {t("project")}
              </div>
            )}
          </>
        )}
        {projects.map((project) => (
          <SelectItem key={project.id} value={`project-${project.id}`}>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span>{project.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
