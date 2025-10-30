import { getAuthSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import Link from "next/link";
import type { Route } from "next";

export async function HeaderNavigation() {
  const authResult = await getAuthSession();

  if (authResult.isErr()) {
    logger.error("Failed to get auth session in HeaderNavigation", {
      component: "HeaderNavigation",
      error: authResult.error,
    });
    // Fail gracefully - don't show navigation if auth check fails
    return null;
  }

  const { isAuthenticated } = authResult.value;

  if (!isAuthenticated) {
    return null;
  }

  const links = [
    { to: "/", label: "Dashboard" },
    { to: "/projects", label: "Projects" },
    { to: "/tasks", label: "Tasks" },
  ];

  return (
    <nav className="flex gap-4">
      {links.map(({ to, label }) => (
        <Link
          key={to}
          href={to as Route}
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

