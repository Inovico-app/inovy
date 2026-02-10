"use client";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logger.error("Global error occurred", {
      component: "GlobalError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
          <div className="text-center space-y-4 max-w-md">
            <div className="flex justify-center">
              <div className="p-3 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong
            </h1>
            <p className="text-muted-foreground">
              A critical error occurred. Please try refreshing the page or contact
              support if the problem persists.
            </p>
            {/* Only show error details in development mode */}
            {typeof window !== "undefined" &&
              window.location.hostname === "localhost" &&
              error.message && (
                <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                  {error.message}
                </p>
              )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={reset}>
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

