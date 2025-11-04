"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@ai-sdk/react";
import { Building2, FolderOpen } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { ChatContextSelector } from "./chat-context-selector";
import { ContextSwitchDialog } from "./context-switch-dialog";

interface SourceReference {
  contentId: string;
  contentType: "recording" | "transcription" | "summary" | "task";
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}

interface UnifiedChatInterfaceProps {
  isAdmin: boolean;
  projects: Project[];
  defaultContext?: "organization" | "project";
  defaultProjectId?: string;
}

export function UnifiedChatInterface({
  isAdmin,
  projects,
  defaultContext = "project",
  defaultProjectId,
}: UnifiedChatInterfaceProps) {
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

  // Determine API endpoint based on context
  const endpoint =
    context === "organization"
      ? "/api/chat/organization"
      : `/api/chat/${projectId}`;

  // Use AI SDK v6 Beta's useChat hook
  // Using default transport with custom api endpoint
  const { messages, status, error, setMessages, sendMessage } = useChat({
    // @ts-expect-error - api is not in the type
    api: endpoint,
    id: `${context}-${projectId ?? "org"}`, // Unique ID per context
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  // Parse sources from message metadata (we'll pass them via headers)
  const [sources, setSources] = useState<SourceReference[]>([]);

  // Reset conversation when context changes
  useEffect(() => {
    setMessages([]);
    setSources([]);
  }, [context, projectId, setMessages]);

  const handleContextChange = (
    newContext: "organization" | "project",
    newProjectId?: string
  ) => {
    // Check if context is actually changing
    const isContextChanging =
      newContext !== context ||
      (newContext === "project" && newProjectId !== projectId);

    if (!isContextChanging) {
      return;
    }

    // If there are messages, show confirmation dialog
    if (messages.length > 0) {
      setPendingContext({ context: newContext, projectId: newProjectId });
      setShowSwitchDialog(true);
    } else {
      // No messages, switch immediately
      applyContextChange(newContext, newProjectId);
    }
  };

  const applyContextChange = (
    newContext: "organization" | "project",
    newProjectId?: string
  ) => {
    setContext(newContext);
    if (newContext === "project" && newProjectId) {
      setProjectId(newProjectId);
    }
    setPendingContext(null);
  };

  const handleConfirmContextSwitch = () => {
    if (pendingContext) {
      applyContextChange(pendingContext.context, pendingContext.projectId);
    }
    setShowSwitchDialog(false);
  };

  const getTargetContextName = () => {
    if (!pendingContext) return "";
    if (pendingContext.context === "organization") {
      return "Organization-Wide";
    }
    const project = projects.find((p) => p.id === pendingContext.projectId);
    return project?.name ?? "Project";
  };

  const getContextBadge = () => {
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
        {currentProjectName ?? "Project"}
      </Badge>
    );
  };

  const getEmptyStateContent = () => {
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
        title={`Ask questions about ${currentProjectName ?? "this project"}`}
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
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4 bg-background">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ChatContextSelector
                currentContext={context}
                currentProjectId={projectId ?? undefined}
                isAdmin={isAdmin}
                projects={projects}
                onContextChange={handleContextChange}
              />
              {getContextBadge()}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {context === "organization"
              ? "Search across all projects and recordings"
              : `Ask questions about ${currentProjectName ?? "this project"}`}
          </p>
        </div>

        {/* Conversation */}
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 ? (
              getEmptyStateContent()
            ) : (
              <>
                {messages.map((message) => (
                  <Message key={message.id} from={message.role}>
                    <MessageAvatar
                      src={
                        message.role === "user"
                          ? "/placeholder-user.png"
                          : "/placeholder-assistant.png"
                      }
                      name={message.role === "user" ? "You" : "AI"}
                    />
                    <MessageContent>
                      <div className="whitespace-pre-wrap break-words">
                        {message.parts.map((part, index) =>
                          part.type === "text" ? (
                            <span key={index}>{part.text}</span>
                          ) : null
                        )}
                      </div>

                      {/* Show sources for assistant messages */}
                      {message.role === "assistant" && sources.length > 0 && (
                        <Sources>
                          <SourcesTrigger count={sources.length} />
                          <SourcesContent>
                            {sources.map((source, index) => {
                              const href =
                                source.projectId && source.recordingId
                                  ? `/projects/${source.projectId}/recordings/${source.recordingId}`
                                  : "#";
                              return (
                                <Source
                                  key={`${source.contentId}-${index}`}
                                  href={href}
                                  title={source.title}
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {source.title}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {source.contentType}
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                      {source.excerpt}
                                    </p>
                                  </div>
                                </Source>
                              );
                            })}
                          </SourcesContent>
                        </Sources>
                      )}
                    </MessageContent>
                  </Message>
                ))}
              </>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Error Display */}
        {error && (
          <div className="border-t p-4 bg-destructive/10 border-destructive/50">
            <p className="text-sm text-destructive">Error: {error.message}</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4 bg-background">
          <PromptInput
            onSubmit={(message, e) => {
              e.preventDefault();
              if (
                message.text?.trim() &&
                status !== "streaming" &&
                status !== "submitted"
              ) {
                // Validate context
                if (context === "project" && !projectId) {
                  return;
                }
                sendMessage({
                  role: "user",
                  parts: [{ type: "text", text: message.text }],
                });
              }
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  context === "organization"
                    ? "Ask about anything across all your projects..."
                    : `Ask about ${currentProjectName ?? "this project"}...`
                }
                disabled={
                  status === "streaming" ||
                  status === "submitted" ||
                  (context === "project" && !projectId)
                }
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send, Shift+Enter for new line
                </span>
              </PromptInputTools>
              <PromptInputSubmit
                disabled={
                  status === "streaming" ||
                  status === "submitted" ||
                  (context === "project" && !projectId)
                }
                status={
                  status === "streaming" || status === "submitted"
                    ? "streaming"
                    : undefined
                }
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>

      {/* Context Switch Dialog */}
      <ContextSwitchDialog
        open={showSwitchDialog}
        onOpenChange={setShowSwitchDialog}
        onConfirm={handleConfirmContextSwitch}
        targetContextName={getTargetContextName()}
      />
    </>
  );
}

