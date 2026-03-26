import { Message, MessageContent } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useTranslations } from "next-intl";

export function ChatThinkingIndicator() {
  const t = useTranslations("chat");

  return (
    <Message from="assistant">
      <MessageContent>
        <Shimmer className="text-sm" duration={1.5}>
          {t("thinking")}
        </Shimmer>
      </MessageContent>
    </Message>
  );
}
