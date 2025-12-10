"use client";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    logger.error("Dashboard page error occurred", {
      component: "DashboardError",
      error: error instanceof Error ? error : new Error(String(error)),
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-destructive">
          Unable to Load Dashboard
        </h1>
        <p className="text-muted-foreground max-w-md">
          We encountered an error loading your dashboard. Please try refreshing
          the page or contact support if the problem persists.
        </p>
        {process.env.NODE_ENV === "development" && error.message && (
          <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded max-w-2xl">
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
  );
}

