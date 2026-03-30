import type { UIMessage } from "ai";

export const CLASSIFIER_MODEL_ID = "claude-haiku-4-5-20251001";

export function formatConversationHistory(
  history: UIMessage[],
  limit: number,
): string {
  const recentHistory = history.slice(-limit);
  const historyText = recentHistory
    .map((m) => {
      const text = m.parts
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join(" ");
      return `[${m.role}]: ${text}`;
    })
    .join("\n");
  return `<conversation_history>\n${historyText}\n</conversation_history>`;
}
