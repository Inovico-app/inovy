"use client";

import { useActiveMemberRole } from "@/hooks/use-active-member-role";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavLink {
  to: string;
  labelKey: string;
  requiresAdmin?: boolean;
}

const navLinks: NavLink[] = [
  { to: "/", labelKey: "nav.dashboard" },
  { to: "/record", labelKey: "nav.record" },
  { to: "/chat", labelKey: "nav.chat" },
  { to: "/projects", labelKey: "nav.projects" },
  { to: "/tasks", labelKey: "nav.tasks" },
  { to: "/admin", labelKey: "nav.management", requiresAdmin: true },
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
  const { data: memberRoleData } = useActiveMemberRole();
  const { isAdmin, isSuperAdmin } = memberRoleData ?? {};
  const t = useTranslations();

  // Prevent hydration mismatch — intentional synchronous setState in mount effect
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
          .map(({ to, labelKey }) => (
            <Link
              key={to}
              href={to as Route}
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              {t(labelKey)}
            </Link>
          ))}
      </nav>
    );
  }

  return (
    <nav className="flex gap-4 items-center">
      {navLinks
        .filter(({ requiresAdmin }) =>
          requiresAdmin ? Boolean(isAdmin || isSuperAdmin) : true,
        )
        .map(({ to, labelKey }) => {
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
                {t(labelKey)}
              </Link>
            </div>
          );
        })}
    </nav>
  );
}
