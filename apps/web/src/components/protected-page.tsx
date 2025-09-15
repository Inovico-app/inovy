import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { Button } from "./ui/button";

interface ProtectedPageProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectOnAuth?: boolean;
}

export async function ProtectedPage({
  children,
  fallback,
  redirectOnAuth = true,
}: ProtectedPageProps) {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    logger.error("Auth error in ProtectedPage", {
      component: "ProtectedPage",
      error: authResult.error,
    });

    // On auth system failure, redirect to login for safety
    if (redirectOnAuth) {
      redirect("/api/auth/login");
    }

    // Show fallback UI indicating system error
    return (
      fallback || (
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                Service Temporarily Unavailable
              </h1>
              <p className="text-muted-foreground text-lg">
                We're experiencing technical difficulties. Please try again.
              </p>
            </div>
            <div className="space-y-4">
              <Button size="lg" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      )
    );
  }

  const { isAuthenticated } = authResult.value;

  if (!isAuthenticated) {
    if (redirectOnAuth) {
      redirect("/api/auth/login");
    }

    return (
      fallback || (
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Welcome to Inovy</h1>
              <p className="text-muted-foreground text-lg">
                AI-powered meeting recording and task management platform
              </p>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please log in to access your projects, recordings, and tasks.
              </p>
              <LoginLink>
                <Button size="lg">Log In to Continue</Button>
              </LoginLink>
            </div>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

