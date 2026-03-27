"use client";

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface ChatErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChatError({ error, reset }: ChatErrorProps) {
  const t = useTranslations("chat");

  useEffect(() => {
    logger.error("Chat page error occurred", {
      component: "ChatError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
    Sentry.captureException(error, {
      tags: { boundary: "chat" },
      contexts: { error_info: { digest: error.digest } },
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-destructive">
          {t("errorTitle")}
        </h2>
        <p className="text-muted-foreground">{t("errorDescription")}</p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>
            {t("tryAgain")}
          </Button>
          <Button onClick={() => window.location.reload()}>
            {t("refreshPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
