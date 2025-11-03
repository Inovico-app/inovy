"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Source {
  contentId: string;
  contentType: "recording" | "transcription" | "summary" | "task";
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ProjectChatInterfaceProps {
  projectId: string;
  projectName: string;
}

export function ProjectChatInterface({
  projectId,
  projectName,
}: ProjectChatInterfaceProps) {
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
      const response = await fetch(`/api/chat/${projectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
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
          <div>
            <h2 className="text-lg font-semibold">Chat with Project Data</h2>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-lg mb-2">Start a conversation</p>
            <p className="text-sm">
              Ask questions about your project recordings, transcriptions, and
              tasks
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
                  <p className="text-xs font-semibold mb-2">Sources:</p>
                  <div className="space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={`${source.contentId}-${index}`}
                        className="text-xs"
                      >
                        <Link
                          href={`/projects/${projectId}/recordings/${source.recordingId ?? source.contentId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {source.title}
                        </Link>
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
                  Thinking...
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
            placeholder="Ask about your recordings, tasks, or summaries..."
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
