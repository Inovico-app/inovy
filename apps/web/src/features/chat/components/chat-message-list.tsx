import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { CitationMarker } from "./citation-marker";
import { EnhancedSourceCard } from "./enhanced-source-card";
import { useCitationParser } from "../hooks/use-citation-parser";
import type { SourceReference } from "../types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text?: string | null }>;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  messageSourcesMap: Record<string, SourceReference[]>;
  sourceRefsMap: React.MutableRefObject<
    Record<string, Record<number, HTMLDivElement | null>>
  >;
  context: "organization" | "project";
  projectId: string | null;
  setSourceRef: (
    messageId: string,
    sourceIndex: number,
    element: HTMLDivElement | null
  ) => void;
}

export function ChatMessageList({
  messages,
  messageSourcesMap,
  sourceRefsMap,
  context,
  projectId,
  setSourceRef,
}: ChatMessageListProps) {
  const { parseCitations, scrollToSource } = useCitationParser();

  const handleCitationClick = (messageId: string, sourceIndex: number) => {
    scrollToSource(messageId, sourceIndex, sourceRefsMap);
  };

  return (
    <>
      {messages.map((message) => {
        // Initialize source refs for this message if needed
        if (!sourceRefsMap.current[message.id]) {
          sourceRefsMap.current[message.id] = {};
        }

        return (
          <Message key={message.id} from={message.role}>
            <MessageAvatar
              src={
                message.role === "user"
                  ? "/placeholder-user.png"
                  : "/placeholder-assistant.png"
              }
              name={message.role === "user" ? "Me" : "AI"}
            />
            <MessageContent>
              <div className="whitespace-pre-wrap break-words">
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    // Parse citations for assistant messages
                    if (message.role === "assistant") {
                      const parsedParts = parseCitations(
                        part.text || "",
                        message.id
                      );
                      return (
                        <span key={index}>
                          {parsedParts.map((part, i) => {
                            if (part.type === "text") {
                              return <span key={i}>{part.content}</span>;
                            }
                            return (
                              <CitationMarker
                                key={`${part.messageId}-citation-${i}`}
                                citationNumber={part.citationNumber ?? 0}
                                onClick={() =>
                                  handleCitationClick(
                                    part.messageId ?? "",
                                    part.citationIndex ?? 0
                                  )
                                }
                              />
                            );
                          })}
                        </span>
                      );
                    }
                    return <span key={index}>{part.text}</span>;
                  }
                  return null;
                })}
              </div>

              {/* Show sources for assistant messages */}
              {message.role === "assistant" &&
                messageSourcesMap[message.id]?.length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={messageSourcesMap[message.id].length}
                    />
                    <SourcesContent>
                      {messageSourcesMap[message.id].map((source, index) => {
                        // For organization context, use source.projectId
                        // For project context, use projectId from query state
                        const enhancedSource = {
                          ...source,
                          projectId:
                            context === "organization"
                              ? source.projectId
                              : projectId ?? undefined,
                        };

                        return (
                          <EnhancedSourceCard
                            key={`${source.contentId}-${index}`}
                            source={enhancedSource}
                            sourceIndex={index}
                            ref={(el) => {
                              setSourceRef(message.id, index, el);
                            }}
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

