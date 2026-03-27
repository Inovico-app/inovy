"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UseCopyToClipboardReturn {
  isCopied: boolean;
  copyToClipboard: (text: string) => Promise<void>;
}

export function useCopyToClipboard(timeout = 2000): UseCopyToClipboardReturn {
  const t = useTranslations("recordings");
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyToClipboard = useCallback(
    async (text: string) => {
      if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
        toast.error(t("summary.copyFailed"));
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success(t("summary.copied"));

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => setIsCopied(false), timeout);
      } catch {
        toast.error(t("summary.copyFailed"));
      }
    },
    [t, timeout],
  );

  return { isCopied, copyToClipboard };
}
