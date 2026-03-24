import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";
import {
  getToolName,
  isToolPart,
  type MessagePart,
  type SourceReference,
} from "../types";
import { ToolResultCard } from "./tool-result-card";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  messageSourcesMap: Record<string, SourceReference[]>;
  context: "organization" | "project";
  projectId: string | null;
  isStreaming?: boolean;
}

export function ChatMessageList({
  messages,
  messageSourcesMap,
  context,
  projectId,
  isStreaming,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((message, messageIndex) => {
        const isLastAssistant =
          message.role === "assistant" && messageIndex === messages.length - 1;

        return (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.parts.map((part, index) => {
                if (isToolPart(part)) {
                  const toolName = getToolName(part);
                  return (
                    <Tool key={`part-${index}-${part.type}`}>
                      <ToolHeader
                        title={toolName}
                        type={part.type as ToolUIPart["type"]}
                        state={part.state as ToolUIPart["state"]}
                      />
                      <ToolContent>
                        <div className="p-3">
                          <ToolResultCard toolName={toolName} part={part} />
                        </div>
                      </ToolContent>
                    </Tool>
                  );
                }
                if (part.type === "text") {
                  if (message.role === "assistant") {
                    return (
                      <MessageResponse
                        key={`text-part-${index}`}
                        isAnimating={isLastAssistant && isStreaming}
                      >
                        {part.text || ""}
                      </MessageResponse>
                    );
                  }
                  return (
                    <span
                      key={`raw-text-${index}`}
                      className="whitespace-pre-wrap break-words"
                    >
                      {part.text}
                    </span>
                  );
                }
                return null;
              })}

              {/* Show sources only when assistant message has actual content */}
              {message.role === "assistant" &&
                messageSourcesMap[message.id]?.length > 0 &&
                message.parts.some((p) => {
                  if (p.type !== "text") return false;
                  const textPart = p as { text?: string | null };
                  return (textPart.text?.trim() ?? "").length > 0;
                }) && (
                  <Sources>
                    <SourcesTrigger
                      count={messageSourcesMap[message.id].length}
                    />
                    <SourcesContent>
                      {messageSourcesMap[message.id].map((source, index) => {
                        const resolvedProjectId =
                          context === "organization"
                            ? source.projectId
                            : (projectId ?? undefined);
                        const href =
                          resolvedProjectId && source.recordingId
                            ? `/projects/${resolvedProjectId}/recordings/${source.recordingId}${source.timestamp !== undefined ? `?t=${Math.floor(source.timestamp)}` : ""}`
                            : undefined;

                        return (
                          <Source
                            key={`${source.contentId}-${index}`}
                            href={href}
                            title={source.title}
                          />
                        );
                      })}
                    </SourcesContent>
                  </Sources>
                )}
            </MessageContent>
          </Message>
        );
      })}
    </>
  );
}
