import { getBetterAuthSession } from "@/lib/better-auth-session";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

interface ProtectedPageProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectOnAuth?: boolean;
  skipOnboardingCheck?: boolean;
}

export async function ProtectedPage({
  children,
  fallback,
  skipOnboardingCheck = false,
}: ProtectedPageProps) {
  const sessionResult = await getBetterAuthSession();

  const hasSessionError = sessionResult.isErr() || !sessionResult.value.user;

  if (hasSessionError) {
    redirect("/sign-in" as Route);
  }

  const user = sessionResult.value.user;

  // Check onboarding status (skip for onboarding page itself)
  if (!skipOnboardingCheck && user && !user.onboardingCompleted) {
    redirect("/onboarding" as Route);
  }

  return <>{children ?? fallback}</>;
}

