"use client";

import { cn } from "@/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HorizontalNavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

interface HorizontalNavProps {
  items: HorizontalNavItem[];
  ariaLabel: string;
}

export function HorizontalNav({ items, ariaLabel }: HorizontalNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const segments = href.split("/").filter(Boolean);
    const base = `/${segments[0]}`;
    if (href === base) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="border-b bg-background/80 backdrop-blur-sm"
      aria-label={ariaLabel}
    >
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-1 -mb-px">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
