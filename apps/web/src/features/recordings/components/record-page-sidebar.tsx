"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectWithCreatorDto } from "@/server/dto/project.dto";
import { FolderIcon } from "lucide-react";

interface RecordPageSidebarProps {
  projects: ProjectWithCreatorDto[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
}

export function RecordPageSidebar({
  projects,
  selectedProjectId,
  onProjectChange,
}: RecordPageSidebarProps) {
  return (
    <aside className="w-full flex-shrink-0 xl:sticky xl:top-4 h-fit">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5" />
            Project Settings
          </CardTitle>
          <CardDescription>
            Choose which project this recording belongs to
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Project Selection */}
          <div className="space-y-3">
            <Label htmlFor="project-select" className="text-sm font-medium">
              Project
            </Label>
            <Select value={selectedProjectId} onValueChange={onProjectChange}>
              <SelectTrigger
                id="project-select"
                className="w-full min-h-12 h-auto py-3 px-4 items-center justify-between [&>*[data-slot=select-value]]:flex [&>*[data-slot=select-value]]:flex-col [&>*[data-slot=select-value]]:items-start [&>*[data-slot=select-value]]:gap-0.5 [&>*[data-slot=select-value]]:w-full"
              >
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium leading-tight">
                        {project.name}
                      </span>
                      {project.description && (
                        <span className="text-muted-foreground text-xs leading-tight">
                          {project.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

