"use client";

import { SETTINGS_NAV_ITEMS } from "@/features/settings/lib/settings-nav-items";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SettingsSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/settings") return pathname === "/settings";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r bg-card/50 flex-shrink-0 hidden md:flex flex-col">
      <div className="p-6 pb-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      <nav className="flex-1 px-3 pb-6 space-y-0.5">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary -ml-px"
                  : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon
                className={`h-4 w-4 flex-shrink-0 ${
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${active ? "text-primary" : ""}`}>
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
