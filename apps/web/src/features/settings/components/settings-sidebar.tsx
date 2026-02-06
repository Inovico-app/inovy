"use client";

import {
  BotIcon,
  Building2Icon,
  ChevronRightIcon,
  SettingsIcon,
  UserIcon,
  VideoIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}

const SETTINGS_MENU_ITEMS: MenuItem[] = [
  {
    href: "/settings/profile",
    icon: UserIcon,
    title: "Profile",
    description: "Manage your personal account",
  },
  {
    href: "/settings/organization",
    icon: Building2Icon,
    title: "Organization",
    description: "View organization information",
  },
  {
    href: "/settings/agent",
    icon: BotIcon,
    title: "Agent",
    description: "Browse knowledge base documents",
  },
  {
    href: "/settings/bot",
    icon: VideoIcon,
    title: "Bot",
    description: "Configure meeting bot preferences",
  },
  {
    href: "/settings/integrations",
    icon: SettingsIcon,
    title: "Integrations",
    description: "Manage third-party connections",
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/settings") return pathname === "/settings";
    return pathname.startsWith(href);
  };

  const menuItems: MenuItem[] = SETTINGS_MENU_ITEMS;

  return (
    <aside className="w-72 border-r bg-card/50 p-6 flex-shrink-0">
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-1">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your preferences</p>
      </div>

      <nav className="space-y-1">
        {menuItems.map((item) => {
          const active = !item.disabled && isActive(item.href);

          return (
            <Link
              key={item.title}
              href={item.disabled ? "#" : (item.href as Route)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                active
                  ? "bg-primary/10 text-primary"
                  : item.disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`mt-0.5 rounded-md p-1.5 ${
                    active
                      ? "bg-primary/20"
                      : item.disabled
                        ? "bg-muted"
                        : "bg-muted group-hover:bg-muted/70 transition-colors"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 ${
                      active
                        ? "text-primary"
                        : item.disabled
                          ? "text-muted-foreground"
                          : "text-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium text-sm ${active ? "text-primary" : ""}`}
                    >
                      {item.title}
                    </p>
                    {item.badge && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {item.description}
                  </p>
                </div>
              </div>
              {!item.disabled && (
                <ChevronRightIcon
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

