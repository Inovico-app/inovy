import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Building2, FolderOpen } from "lucide-react";

interface ChatEmptyStateProps {
  context: "organization" | "project";
  projectName?: string;
}

export function ChatEmptyState({
  context,
  projectName,
}: ChatEmptyStateProps) {
  if (context === "organization") {
    return (
      <ConversationEmptyState
        icon={
          <div className="p-4 bg-primary/10 rounded-full">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        }
        title="Ask questions across your organization"
        description="Search through all projects, recordings, transcriptions, and tasks. Get cross-project insights and find information across your entire organization."
      >
        <div className="mt-4 max-w-md text-left">
          <p className="text-xs font-semibold mb-2">Example questions:</p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• "What are the common issues across all projects?"</li>
            <li>• "Show me all high-priority tasks from the last month"</li>
            <li>• "Which projects mentioned budget constraints?"</li>
            <li>• "Summarize decisions made across all meetings"</li>
          </ul>
        </div>
      </ConversationEmptyState>
    );
  }

  return (
    <ConversationEmptyState
      icon={
        <div className="p-4 bg-primary/10 rounded-full">
          <FolderOpen className="h-8 w-8 text-primary" />
        </div>
      }
      title={`Ask questions about ${projectName ?? "this project"}`}
      description="Search through recordings, transcriptions, and tasks in this project. Get insights and find information quickly."
    >
      <div className="mt-4 max-w-md text-left">
        <p className="text-xs font-semibold mb-2">Example questions:</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• "What were the main topics discussed in recent meetings?"</li>
          <li>• "Show me all tasks assigned to John"</li>
          <li>• "What decisions were made about the budget?"</li>
          <li>• "Summarize the last recording"</li>
        </ul>
      </div>
    </ConversationEmptyState>
  );
}

