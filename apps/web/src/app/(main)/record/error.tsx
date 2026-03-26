"use client";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface RecordErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RecordError({ error, reset }: RecordErrorProps) {
  const t = useTranslations("recordings");
  useEffect(() => {
    logger.error("Record page error occurred", {
      component: "RecordError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-destructive">
          {t("error.recordingError")}
        </h2>
        <p className="text-muted-foreground">
          {t("error.recordingErrorDescription")}
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>
            {t("error.tryAgain")}
          </Button>
          <Button onClick={() => window.location.reload()}>
            {t("error.refreshPage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
