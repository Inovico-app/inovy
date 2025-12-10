import { ChatContextSelector } from "./chat-context-selector";
import { ChatContextBadge } from "./chat-context-badge";
import type { Project } from "../types";

interface ChatHeaderProps {
  context: "organization" | "project";
  projectId: string | null;
  currentProjectName: string | undefined;
  isAdmin: boolean;
  projects: Project[];
  onContextChange: (
    newContext: "organization" | "project",
    newProjectId?: string
  ) => void;
}

export function ChatHeader({
  context,
  projectId,
  currentProjectName,
  isAdmin,
  projects,
  onContextChange,
}: ChatHeaderProps) {
  return (
    <div className="border-b p-4 bg-background shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ChatContextSelector
            currentContext={context}
            currentProjectId={projectId ?? undefined}
            isAdmin={isAdmin}
            projects={projects}
            onContextChange={onContextChange}
          />
          <ChatContextBadge context={context} projectName={currentProjectName} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {context === "organization"
          ? "Search across all projects and recordings"
          : `Ask questions about ${currentProjectName ?? "this project"}`}
      </p>
    </div>
  );
}

