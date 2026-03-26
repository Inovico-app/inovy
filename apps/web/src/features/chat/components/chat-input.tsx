import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { ChatStatus } from "ai";

interface ChatInputProps {
  context: "organization" | "project";
  projectId: string | null;
  currentProjectName: string | undefined;
  status: ChatStatus;
  agentEnabled: boolean;
  onSendMessage: (text: string) => void;
}

export function ChatInput({
  context,
  projectId,
  currentProjectName,
  status,
  agentEnabled,
  onSendMessage,
}: ChatInputProps) {
  const isDisabled =
    status === "streaming" ||
    status === "submitted" ||
    (context === "project" && !projectId) ||
    !agentEnabled;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-4 pt-4">
      <PromptInput
        onSubmit={(message, e) => {
          e.preventDefault();
          if (message.text?.trim() && !isDisabled) {
            onSendMessage(message.text);
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
            disabled={isDisabled}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <span className="text-xs text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </span>
          </PromptInputTools>
          <PromptInputSubmit disabled={isDisabled} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
