import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectFilterDropdownProps {
  projects: Array<{ id: string; name: string; taskCount: number }>;
  selectedProjectIds: string[];
  onToggle: (projectId: string) => void;
}

export function ProjectFilterDropdown({
  projects,
  selectedProjectIds,
  onToggle,
}: ProjectFilterDropdownProps) {
  const t = useTranslations("tasks");
  const buttonText =
    selectedProjectIds.length === 0
      ? t("allProjectsFilter")
      : selectedProjectIds.length === 1
        ? projects.find((p) => p.id === selectedProjectIds[0])?.name
        : t("projectsSelected", { count: selectedProjectIds.length });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t("projects")}
      </h3>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" className="w-full justify-between" />
          }
        >
          <span className="text-sm">{buttonText}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel>{t("selectProjects")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {projects.map((project) => (
            <DropdownMenuCheckboxItem
              key={project.id}
              checked={selectedProjectIds.includes(project.id)}
              onCheckedChange={() => onToggle(project.id)}
            >
              <div className="flex items-center justify-between w-full">
                <span className="truncate">{project.name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {project.taskCount}
                </Badge>
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
