import { getBetterAuthSession } from "@/lib/better-auth-session";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

interface ProtectedPageProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectOnAuth?: boolean;
}

export async function ProtectedPage({
  children,
  fallback,
}: ProtectedPageProps) {
  const sessionResult = await getBetterAuthSession();

  const hasSessionError = sessionResult.isErr() || !sessionResult.value.user;

  if (hasSessionError) {
    redirect("/sign-in" as Route);
  }

  return <>{children ?? fallback}</>;
}

