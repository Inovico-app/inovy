import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { useTranslations } from "next-intl";
import { Building2, FolderOpen } from "lucide-react";

interface ChatEmptyStateProps {
  context: "organization" | "project";
  projectName?: string;
}

export function ChatEmptyState({ context, projectName }: ChatEmptyStateProps) {
  const t = useTranslations("chat");
  if (context === "organization") {
    return (
      <ConversationEmptyState
        icon={
          <div className="p-4 bg-primary/10 rounded-full">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        }
        title={t("orgEmptyTitle")}
        description={t("orgEmptyDescription")}
      >
        <div className="mt-4 max-w-md text-left">
          <p className="text-xs font-semibold mb-2">{t("exampleQuestions")}</p>
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
      title={
        projectName
          ? t("projectEmptyTitle", { name: projectName })
          : t("projectEmptyTitleDefault")
      }
      description={t("projectEmptyDescription")}
    >
      <div className="mt-4 max-w-md text-left">
        <p className="text-xs font-semibold mb-2">{t("exampleQuestions")}</p>
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
