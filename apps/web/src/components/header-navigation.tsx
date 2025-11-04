"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";

interface NavLink {
  to: string;
  label: string;
  requiresAdmin?: boolean;
}

const navLinks: NavLink[] = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/chat", label: "Organization Chat", requiresAdmin: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

export function HeaderNavigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { isAdmin, isLoading } = useUserRole();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    // Show all links during loading to prevent layout shift
    // Admin-only links will be hidden once role is determined
    return (
      <nav className="flex gap-4">
        {navLinks
          .filter((link) => !link.requiresAdmin)
          .map(({ to, label }) => (
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

  // Filter nav links based on user role
  const visibleLinks = navLinks.filter((link) => {
    if (link.requiresAdmin) {
      return isAdmin;
    }
    return true;
  });

  return (
    <nav className="flex gap-4">
      {visibleLinks.map(({ to, label }) => {
        const active = isActive(pathname, to);
        return (
          <Link
            key={to}
            href={to as Route}
            className={`text-sm font-medium transition-colors ${
              active
                ? "text-foreground underline underline-offset-4 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

