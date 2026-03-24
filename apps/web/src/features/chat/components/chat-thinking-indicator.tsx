import { Message, MessageContent } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";

export function ChatThinkingIndicator() {
  return (
    <Message from="assistant">
      <MessageContent>
        <Shimmer className="text-sm" duration={1.5}>
          Thinking...
        </Shimmer>
      </MessageContent>
    </Message>
  );
}
