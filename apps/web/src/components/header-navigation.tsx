"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useEffect, useState } from "react";

interface NavLink {
  to: string;
  label: string;
}

const navLinks: NavLink[] = [
  { to: "/", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/tasks", label: "Tasks" },
  { to: "/chat", label: "Organization Chat" },
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

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <nav className="flex gap-4">
        {navLinks.map(({ to, label }) => (
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
    <nav className="flex gap-4">
      {navLinks.map(({ to, label }) => {
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

