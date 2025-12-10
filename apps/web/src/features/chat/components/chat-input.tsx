import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

interface ChatInputProps {
  context: "organization" | "project";
  projectId: string | null;
  currentProjectName: string | undefined;
  status: "streaming" | "submitted" | "idle" | "error" | "ready";
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
    status === "ready" ||
    (context === "project" && !projectId) ||
    !agentEnabled;

  return (
    <div className="border-t p-4 bg-background">
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
          <PromptInputSubmit
            disabled={isDisabled}
            status={
              status === "streaming" || status === "submitted" || status === "ready"
                ? "streaming"
                : undefined
            }
          />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

