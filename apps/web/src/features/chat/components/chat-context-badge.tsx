import { Badge } from "@/components/ui/badge";
import { Building2, FolderOpen } from "lucide-react";

interface ChatContextBadgeProps {
  context: "organization" | "project";
  projectName?: string;
}

export function ChatContextBadge({
  context,
  projectName,
}: ChatContextBadgeProps) {
  if (context === "organization") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Building2 className="h-3 w-3" />
        Organization
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <FolderOpen className="h-3 w-3" />
      {projectName ?? "Project"}
    </Badge>
  );
}

