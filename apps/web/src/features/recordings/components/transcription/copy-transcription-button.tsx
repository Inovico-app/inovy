"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface CopyTranscriptionButtonProps {
  transcriptionText: string;
  label?: string;
}

export function CopyTranscriptionButton({
  transcriptionText,
  label,
}: CopyTranscriptionButtonProps) {
  const t = useTranslations("recordings");
  const effectiveLabel = label ?? t("transcription.copy");
  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) {
      toast.error(t("transcription.copyNotSupported"));
      return;
    }

    try {
      await navigator.clipboard.writeText(transcriptionText);
      toast.success(t("transcription.transcriptionCopied"));
    } catch (error) {
      console.error("Failed to copy transcription:", error);
      toast.error(t("transcription.copyFailed"));
    }
  }, [transcriptionText]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      title={effectiveLabel}
    >
      <Copy className="h-4 w-4 mr-1" />
      {effectiveLabel}
    </Button>
  );
}
