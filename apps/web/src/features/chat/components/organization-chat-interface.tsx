"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Building2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface Source {
  contentId: string;
  contentType: "recording" | "transcription" | "summary" | "task";
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
  projectId?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function OrganizationChatInterface() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setIsLoading(true);

    // Add user message immediately
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await fetch("/api/chat/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          ...(conversationId && { conversationId }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 403) {
          throw new Error(
            error.message ??
              "You don't have permission to access organization-level chat"
          );
        }
        throw new Error(error.error ?? "Failed to get response");
      }

      // Extract headers
      const convId = response.headers.get("X-Conversation-Id");
      if (convId && !conversationId) {
        setConversationId(convId);
      }

      const sourcesHeader = response.headers.get("X-Sources");
      if (sourcesHeader) {
        try {
          const parsedSources = JSON.parse(sourcesHeader);
          setSources(parsedSources);
        } catch (e) {
          console.error("Failed to parse sources", e);
        }
      }

      // Read the streamed response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "",
        };
        setMessages((prev) => [...prev, assistantMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          assistantContent += chunk;

          // Update the assistant message
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content = assistantContent;
            }
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                Organization-Wide Chat
              </h2>
              <p className="text-sm text-muted-foreground">
                Search across all projects and recordings
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Building2 className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12 space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium mb-2">
                Ask questions across your organization
              </p>
              <p className="text-sm max-w-md mx-auto">
                Search through all projects, recordings, transcriptions, and
                tasks. Get cross-project insights and find information across
                your entire organization.
              </p>
            </div>
            <div className="max-w-md mx-auto text-left">
              <p className="text-xs font-semibold mb-2">Example questions:</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                <li>• "What are the common issues across all projects?"</li>
                <li>
                  • "Show me all high-priority tasks from the last month"
                </li>
                <li>• "Which projects mentioned budget constraints?"</li>
                <li>• "Summarize decisions made across all meetings"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              {message.role === "assistant" && sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs font-semibold mb-2">
                    Sources ({sources.length}):
                  </p>
                  <div className="space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={`${source.contentId}-${index}`}
                        className="text-xs"
                      >
                        {source.projectId && source.recordingId ? (
                          <Link
                            href={`/projects/${source.projectId}/recordings/${source.recordingId}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {source.title}
                          </Link>
                        ) : (
                          <span className="font-medium">{source.title}</span>
                        )}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {source.contentType}
                        </Badge>
                        <p className="text-muted-foreground mt-1">
                          {source.excerpt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="max-w-[80%] p-4 bg-muted">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Searching across all projects...
                </span>
              </div>
            </Card>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <Card className="max-w-[80%] p-4 bg-destructive/10 border-destructive">
              <p className="text-sm text-destructive">Error: {error}</p>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about anything across all your projects..."
            className="min-h-[60px] max-h-[200px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
              }
            }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

