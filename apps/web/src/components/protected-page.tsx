import { getBetterAuthSession } from "@/lib/better-auth-session";
import { logger } from "@/lib/logger";
import { redirect } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
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
  try {
    const sessionResult = await getBetterAuthSession();

    if (sessionResult.isErr() || !sessionResult.value.user) {
      if (redirectOnAuth) {
        redirect("/sign-in" as Route);
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
                <Link href={"/sign-in" as Route}>
                  <Button size="lg">Log In to Continue</Button>
                </Link>
              </div>
            </div>
          </div>
        )
      );
    }

    return <>{children}</>;
  } catch (error) {
    logger.error("Auth error in ProtectedPage", {
      component: "ProtectedPage",
      error: error instanceof Error ? error.message : String(error),
    });

    // On auth system failure, redirect to login for safety
    if (redirectOnAuth) {
      redirect("/sign-in" as Route);
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
              <Link href={"/sign-in" as Route}>
                <Button size="lg">Go to Sign In</Button>
              </Link>
            </div>
          </div>
        </div>
      )
    );
  }
}

