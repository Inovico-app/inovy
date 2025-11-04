"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, FolderOpen } from "lucide-react";

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
    projectId?: string
  ) => void;
}

export function ChatContextSelector({
  currentContext,
  currentProjectId,
  isAdmin,
  projects,
  onContextChange,
}: ChatContextSelectorProps) {
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
    <Select value={currentValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Select context..." />
      </SelectTrigger>
      <SelectContent>
        {isAdmin && (
          <>
            <SelectItem value="organization">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Organization-Wide</span>
              </div>
            </SelectItem>
            {projects.length > 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-t my-1">
                Projects
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

