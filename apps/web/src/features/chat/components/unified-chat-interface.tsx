"use client";

import { AgentDisabledBanner } from "@/components/agent-disabled-banner";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Activity, useEffect, useEffectEvent, useMemo, useRef } from "react";
import { getConversationMessagesAction } from "../actions/conversation-history";
import { useChatContext } from "../hooks/use-chat-context";
import { useChatSources } from "../hooks/use-chat-sources";
import type { MessagePart, Project } from "../types";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessageList } from "./chat-message-list";
import { ChatThinkingIndicator } from "./chat-thinking-indicator";
import { ContextSwitchDialog } from "./context-switch-dialog";
import { ConversationHistorySidebar } from "./conversation-history-sidebar";

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

  // Ref to track conversation ID across renders without recreating the Chat instance.
  // The transport is captured once by useChat, so we need a ref for the fetch closure.
  const conversationIdRef = useRef(chatContext.conversationId);

  // Sync ref with latest conversationId outside of render (in an effect)
  useEffect(() => {
    conversationIdRef.current = chatContext.conversationId;
  }, [chatContext.conversationId]);

  // Memoize transport to avoid recreating on every render and to keep ref access
  // out of the render body (refs are only read inside callbacks, not during render).
  const chatContextRef = useRef(chatContext);
  useEffect(() => {
    chatContextRef.current = chatContext;
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          context: chatContextRef.current.context,
          ...(chatContextRef.current.context === "project" &&
          chatContextRef.current.projectId
            ? { projectId: chatContextRef.current.projectId }
            : {}),
          ...(conversationIdRef.current
            ? { conversationId: conversationIdRef.current }
            : {}),
        }),
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init);

          // Capture conversation ID from first response to maintain conversation continuity
          const returnedConversationId =
            response.headers.get("X-Conversation-Id");
          if (returnedConversationId && !conversationIdRef.current) {
            conversationIdRef.current = returnedConversationId;
            chatContextRef.current.setConversationId(returnedConversationId);
          }

          return response;
        },
      }),
     
    []
  );

  // Use unified API endpoint for both contexts
  // Note: Type mismatch between ai package versions - DefaultChatTransport works correctly at runtime
  const { messages, status, error, setMessages, sendMessage } = useChat({
    id: `${chatContext.context}-${chatContext.projectId ?? "org"}`,
    transport,
    onError: (err: Error) => {
      console.error("Chat error:", err);
    },
  });

  // Filter out system messages for source extraction
  const filteredMessages = messages.filter(
    (msg): msg is Extract<typeof msg, { role: "user" | "assistant" }> =>
      msg.role === "user" || msg.role === "assistant"
  );
  const { messageSourcesMap, sourceRefsMap, setSourceRef } = useChatSources(
    filteredMessages as Array<{
      id: string;
      role: "user" | "assistant";
      metadata?: unknown;
    }>
  );

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
    conversationIdRef.current = null;
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
        const loadedMessages = result.data.map((msg) => {
          const parts: MessagePart[] = [];

          // Reconstruct tool parts from persisted toolCalls (v6 format)
          if (msg.toolCalls?.length) {
            for (const tc of msg.toolCalls) {
              parts.push({
                type: `tool-${tc.name}`,
                toolCallId: tc.id,
                state: tc.result ? "output-available" : "output-unavailable",
                input: tc.arguments,
                output: tc.result ?? undefined,
              });
            }
          }

          // Always add text part for consistency (matches original behavior)
          parts.push({ type: "text" as const, text: msg.content });

          return {
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: msg.createdAt,
            parts,
            metadata: msg.sources ? { sources: msg.sources } : undefined,
          };
        });

        // Cast needed: our MessagePart[] is structurally compatible with
        // UIMessage parts at runtime but TypeScript can't verify the union
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMessages(loadedMessages as any);
      }
    } catch (error) {
      console.error("Failed to load conversation history:", error);
    }
  });

  const handleContextChange = useEffectEvent(
    (newContext: "organization" | "project", newProjectId?: string) => {
      chatContext.handleContextChangeWithMessages(
        newContext,
        newProjectId,
        messages.length > 0
      );
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
              <>
                <ChatMessageList
                  messages={
                    filteredMessages as Array<{
                      id: string;
                      role: "user" | "assistant";
                      parts: Array<{ type: "text"; text?: string | null }>;
                    }>
                  }
                  messageSourcesMap={messageSourcesMap}
                  sourceRefsMap={sourceRefsMap}
                  context={chatContext.context}
                  projectId={chatContext.projectId}
                  setSourceRef={setSourceRef}
                />
                {status === "submitted" && <ChatThinkingIndicator />}
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

