import { useState } from "react";
import { toast } from "sonner";

export function useConversationExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportConversation = async (
    conversationId: string,
    format: "text" | "pdf"
  ) => {
    setIsExporting(true);
    try {
      const response = await fetch(
        `/api/chat/export/${conversationId}?format=${format}`
      );

      if (!response.ok) {
        throw new Error("Failed to export conversation");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch =
        contentDisposition?.match(/filename="(.+)"/) ?? null;
      const filename =
        filenameMatch?.[1] ?? `conversation-${conversationId}.${format === "pdf" ? "pdf" : "txt"}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Conversation exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(
        `Failed to export conversation: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportConversation,
    isExporting,
  };
}

