"use client";

import { useUserRole } from "@/hooks/use-user-role";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavLink {
  to: string;
  label: string;
  requiresAdmin?: boolean;
}

const navLinks: NavLink[] = [
  { to: "/", label: "Dashboard" },
  { to: "/record", label: "Record" },
  { to: "/chat", label: "Chat" },
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/admin", label: "Management", requiresAdmin: true },
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
  const { data: userRoleData } = useUserRole();
  const { isAdmin, isSuperAdmin, roles } = userRoleData ?? {};

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
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

  return (
    <nav className="flex gap-4 items-center">
      {navLinks
        .filter(({ requiresAdmin }) =>
          requiresAdmin ? Boolean(isAdmin || isSuperAdmin) : true
        )
        .map(({ to, label }) => {
          const active = isActive(pathname, to);
          return (
            <div key={to} className="flex items-center gap-1.5">
              <Link
                href={to as Route}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? "text-foreground underline underline-offset-4 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                }`}
              >
                {label}
              </Link>
            </div>
          );
        })}
    </nav>
  );
}

