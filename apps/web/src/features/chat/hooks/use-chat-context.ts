import { useQueryState } from "nuqs";
import { useEffectEvent, useState } from "react";
import type { Project } from "../types";

interface UseChatContextOptions {
  isAdmin: boolean;
  projects: Project[];
  defaultContext?: "organization" | "project";
  defaultProjectId?: string;
}

interface UseChatContextReturn {
  context: "organization" | "project";
  projectId: string | null;
  conversationId: string | null;
  currentProjectName: string | undefined;
  showSwitchDialog: boolean;
  pendingContext: {
    context: "organization" | "project";
    projectId?: string;
  } | null;
  setContext: (context: "organization" | "project") => void;
  setProjectId: (projectId: string | null) => void;
  setConversationId: (id: string | null) => void;
  handleContextChange: (
    newContext: "organization" | "project",
    newProjectId?: string
  ) => void;
  handleContextChangeWithMessages: (
    newContext: "organization" | "project",
    newProjectId?: string,
    hasMessages?: boolean
  ) => void;
  handleConfirmContextSwitch: () => void;
  setShowSwitchDialog: (show: boolean) => void;
  getTargetContextName: () => string;
}

export function useChatContext({
  isAdmin,
  projects,
  defaultContext = "project",
  defaultProjectId,
}: UseChatContextOptions): UseChatContextReturn {
  // Determine initial values
  const initialContext =
    isAdmin && defaultContext === "organization" ? "organization" : "project";
  const initialProjectId = defaultProjectId ?? projects[0]?.id;

  // URL state management
  const [context, setContext] = useQueryState<"organization" | "project">(
    "context",
    {
      defaultValue: initialContext,
      parse: (value) => (value === "organization" ? "organization" : "project"),
    }
  );

  const [projectId, setProjectId] = useQueryState("projectId", {
    defaultValue: initialProjectId,
  });

  const [conversationId, setConversationId] = useQueryState("conversationId");

  // Context switch dialog state
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingContext, setPendingContext] = useState<{
    context: "organization" | "project";
    projectId?: string;
  } | null>(null);

  // Get current project name
  const currentProjectName = projectId
    ? projects.find((p) => p.id === projectId)?.name
    : undefined;

  const applyContextChange = useEffectEvent(
    (newContext: "organization" | "project", newProjectId?: string) => {
      setContext(newContext);
      if (newContext === "project" && newProjectId) {
        setProjectId(newProjectId);
      }
      setPendingContext(null);
    }
  );

  const handleContextChange = useEffectEvent(
    (
      newContext: "organization" | "project",
      newProjectId: string | undefined,
      hasMessages: boolean
    ) => {
      // Check if context is actually changing
      const isContextChanging =
        newContext !== context ||
        (newContext === "project" && newProjectId !== projectId);

      if (!isContextChanging) {
        return;
      }

      // If there are messages, show confirmation dialog
      if (hasMessages) {
        setPendingContext({ context: newContext, projectId: newProjectId });
        setShowSwitchDialog(true);
      } else {
        // No messages, switch immediately
        applyContextChange(newContext, newProjectId);
      }
    }
  );

  const handleConfirmContextSwitch = useEffectEvent(() => {
    if (pendingContext) {
      applyContextChange(pendingContext.context, pendingContext.projectId);
    }
    setShowSwitchDialog(false);
  });

  const getTargetContextName = () => {
    if (!pendingContext) return "";
    if (pendingContext.context === "organization") {
      return "Organization-Wide";
    }
    const project = projects.find((p) => p.id === pendingContext.projectId);
    return project?.name ?? "Project";
  };

  return {
    context,
    projectId,
    conversationId,
    currentProjectName,
    showSwitchDialog,
    pendingContext,
    setContext,
    setProjectId,
    setConversationId,
    handleContextChange: (
      newContext: "organization" | "project",
      newProjectId?: string
    ): void => {
      handleContextChange(newContext, newProjectId ?? undefined, false);
    },
    handleContextChangeWithMessages: (
      newContext: "organization" | "project",
      newProjectId?: string,
      hasMessages = false
    ): void => {
      handleContextChange(newContext, newProjectId ?? undefined, hasMessages);
    },
    handleConfirmContextSwitch,
    setShowSwitchDialog,
    getTargetContextName,
  };
}

