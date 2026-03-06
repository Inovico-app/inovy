import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";

export function ChatThinkingIndicator() {
  return (
    <Message from="assistant">
      <MessageAvatar src="/placeholder-assistant.png" name="AI" />
      <MessageContent>
        <div
          className="flex items-center gap-1.5 py-1"
          role="status"
          aria-label="Assistant is thinking"
        >
          <span className="sr-only">Thinking...</span>
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:150ms]" />
          <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:300ms]" />
        </div>
      </MessageContent>
    </Message>
  );
}
