"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

interface CopyTranscriptionButtonProps {
  transcriptionText: string;
  label?: string;
}

export function CopyTranscriptionButton({
  transcriptionText,
  label = "Kopiëren",
}: CopyTranscriptionButtonProps) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(transcriptionText);
      toast.success("Transcriptie gekopieerd naar klembord");
    } catch (error) {
      console.error("Failed to copy transcription:", error);
      toast.error("Fout bij kopiëren naar klembord");
    }
  }, [transcriptionText]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      title={label}
    >
      <Copy className="h-4 w-4 mr-1" />
      {label}
    </Button>
  );
}

