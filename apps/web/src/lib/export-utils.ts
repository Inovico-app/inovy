import type { ChatConversation, ChatMessage } from "@/server/db/schema";

/**
 * Format conversation as plain text
 */
export function formatConversationAsText(
  conversation: ChatConversation,
  messages: ChatMessage[]
): string {
  const lines: string[] = [];

  // Header
  lines.push("=".repeat(80));
  lines.push(`Conversation: ${conversation.title || "Untitled"}`);
  lines.push(`Context: ${conversation.context}`);
  lines.push(`Created: ${conversation.createdAt.toLocaleString()}`);
  lines.push(`Last Updated: ${conversation.updatedAt.toLocaleString()}`);
  lines.push("=".repeat(80));
  lines.push("");

  // Messages
  for (const message of messages) {
    const timestamp = message.createdAt.toLocaleString();
    const role = message.role === "user" ? "User" : "Assistant";

    lines.push(`[${timestamp}] ${role}:`);
    lines.push(message.content);

    // Add sources if present
    if (message.role === "assistant" && message.sources) {
      lines.push("");
      lines.push("Sources:");
      const sources = message.sources as Array<{
        title: string;
        contentType: string;
      }>;
      for (let i = 0; i < sources.length; i++) {
        lines.push(`  [${i + 1}] ${sources[i].title} (${sources[i].contentType})`);
      }
    }

    lines.push("");
    lines.push("-".repeat(80));
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate PDF from conversation
 * Note: This is a placeholder. In production, you'd use a library like pdfkit or react-pdf
 */
export async function generateConversationPDF(
  conversation: ChatConversation,
  messages: ChatMessage[]
): Promise<Blob> {
  // For now, we'll create a simple text-based PDF using a basic approach
  // In production, use a proper PDF library like pdfkit or jsPDF
  
  const text = formatConversationAsText(conversation, messages);
  
  // Create a simple text blob (in real implementation, use PDF library)
  const blob = new Blob([text], { type: "application/pdf" });
  
  return blob;
}

