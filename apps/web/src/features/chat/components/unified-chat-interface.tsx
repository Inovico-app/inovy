"use client";

import { AgentDisabledBanner } from "@/components/agent-disabled-banner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Activity, useEffect, useEffectEvent } from "react";
import { getConversationMessagesAction } from "../actions/conversation-history";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessageList } from "./chat-message-list";
import { ContextSwitchDialog } from "./context-switch-dialog";
import { ConversationHistorySidebar } from "./conversation-history-sidebar";
import { useChatContext } from "../hooks/use-chat-context";
import { useChatSources } from "../hooks/use-chat-sources";
import type { Project } from "../types";

interface UnifiedChatInterfaceProps {
  isAdmin: boolean;
  projects: Project[];
  defaultContext?: "organization" | "project";
  defaultProjectId?: string;
  agentEnabled?: boolean;
  organizationName?: string;
}

export function UnifiedChatInterface({
  isAdmin,
  projects,
  defaultContext = "project",
  defaultProjectId,
  agentEnabled = true,
  organizationName,
}: UnifiedChatInterfaceProps) {
  const chatContext = useChatContext({
    isAdmin,
    projects,
    defaultContext,
    defaultProjectId,
  });

  // Use unified API endpoint for both contexts
  const { messages, status, error, setMessages, sendMessage } = useChat({
    id:
      chatContext.conversationId ??
      `${chatContext.context}-${chatContext.projectId ?? "org"}`,
    // @ts-expect-error - DefaultChatTransport is not assignable to ChatTransport
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        context: chatContext.context,
        ...(chatContext.context === "project" && chatContext.projectId
          ? { projectId: chatContext.projectId }
          : {}),
        ...(chatContext.conversationId
          ? { conversationId: chatContext.conversationId }
          : {}),
      },
    }),
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  // Filter out system messages for source extraction
  const filteredMessages = messages.filter(
    (msg): msg is Extract<typeof msg, { role: "user" | "assistant" }> =>
      msg.role === "user" || msg.role === "assistant"
  );
  const { messageSourcesMap, sourceRefsMap, setSourceRef } =
    useChatSources(filteredMessages as Array<{ id: string; role: "user" | "assistant"; metadata?: unknown }>);

  // Reset conversation when context changes or starting new conversation
  useEffect(() => {
    if (!chatContext.conversationId) {
      setMessages([]);
    }
  }, [
    chatContext.context,
    chatContext.projectId,
    chatContext.conversationId,
    setMessages,
  ]);

  // Handle new conversation
  const handleNewConversation = useEffectEvent(() => {
    chatContext.setConversationId(null);
    setMessages([]);
  });

  // Handle resume conversation
  const handleResumeConversation = useEffectEvent(async (id: string) => {
    chatContext.setConversationId(id);

    // Load conversation history
    try {
      const result = await getConversationMessagesAction({
        conversationId: id,
      });
      if (result?.data) {
        // Convert ChatMessage[] to format expected by useChat
        const loadedMessages = result.data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: msg.createdAt,
          parts: [{ type: "text" as const, text: msg.content }],
          metadata: msg.sources ? { sources: msg.sources } : undefined,
        }));

        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Failed to load conversation history:", error);
    }
  });

  const handleContextChange = useEffectEvent(
    (newContext: "organization" | "project", newProjectId?: string) => {
      chatContext.handleContextChangeWithMessages(newContext, newProjectId, messages.length > 0);
    }
  );

  const handleSendMessage = useEffectEvent((text: string) => {
    if (text.trim() && status !== "streaming" && status !== "submitted") {
      // Validate context
      if (chatContext.context === "project" && !chatContext.projectId) {
        return;
      }
      sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    }
  });

  return (
    <div className="flex h-full">
      <ConversationHistorySidebar
        context={chatContext.context}
        projectId={chatContext.projectId ?? undefined}
        currentConversationId={chatContext.conversationId ?? undefined}
        onSelectConversation={handleResumeConversation}
        onNewConversation={handleNewConversation}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        <ChatHeader
          context={chatContext.context}
          projectId={chatContext.projectId}
          currentProjectName={chatContext.currentProjectName}
          isAdmin={isAdmin}
          projects={projects}
          onContextChange={handleContextChange}
        />

        {/* Agent Disabled Banner */}
        <Activity mode={!agentEnabled ? "visible" : "hidden"}>
          <div className="p-4 shrink-0">
            <AgentDisabledBanner organizationName={organizationName} />
          </div>
        </Activity>

        {/* Conversation */}
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ChatEmptyState
                context={chatContext.context}
                projectName={chatContext.currentProjectName}
              />
            ) : (
              <ChatMessageList
                messages={filteredMessages as Array<{ id: string; role: "user" | "assistant"; parts: Array<{ type: "text"; text?: string | null }> }>}
                messageSourcesMap={messageSourcesMap}
                sourceRefsMap={sourceRefsMap}
                context={chatContext.context}
                projectId={chatContext.projectId}
                setSourceRef={setSourceRef}
              />
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

        <ChatInput
          context={chatContext.context}
          projectId={chatContext.projectId}
          currentProjectName={chatContext.currentProjectName}
          status={status}
          agentEnabled={agentEnabled}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Context Switch Dialog */}
      <ContextSwitchDialog
        open={chatContext.showSwitchDialog}
        onOpenChange={chatContext.setShowSwitchDialog}
        onConfirm={chatContext.handleConfirmContextSwitch}
        targetContextName={chatContext.getTargetContextName()}
      />
    </div>
  );
}
