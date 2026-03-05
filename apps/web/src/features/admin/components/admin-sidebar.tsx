"use client";

import { authClient } from "@/lib/auth-client";
import { Permissions } from "@/lib/rbac/permissions";
import {
  ActivityIcon,
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  ChevronRightIcon,
  FileTextIcon,
  ShieldCheckIcon,
  SettingsIcon,
  UsersIcon,
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

const BASE_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    href: "/admin/users",
    icon: UsersIcon,
    title: "User Management",
    description: "Manage roles and permissions",
  },
  {
    href: "/admin/privileged-access",
    icon: ShieldCheckIcon,
    title: "Privileged Access",
    description: "Monitor high-privilege accounts",
  },
  {
    href: "/admin/audit-logs",
    icon: FileTextIcon,
    title: "Audit Logs",
    description: "Track system events",
  },
  {
    href: "/admin/agent-analytics",
    icon: BarChart3Icon,
    title: "User Analytics",
    description: "User engagement and feedback metrics",
  },
  {
    href: "/admin/agent-metrics",
    icon: ActivityIcon,
    title: "Agent Metrics",
    description: "System-wide metrics and detailed records",
  },
];

// Only show Organizations for superadmins
const SUPER_ADMIN_MENU_ITEMS: MenuItem[] = [
  {
    href: "/admin/agent-config",
    icon: BotIcon,
    title: "Agent Configuration",
    description: "Manage agent access per organization",
  },
  {
    href: "/admin/organizations",
    icon: Building2Icon,
    title: "Organizations",
    description: "View and edit organizations",
  },
];

const INACTIVE_MENU_ITEMS: MenuItem[] = [
  {
    href: "#",
    icon: SettingsIcon,
    title: "System Settings",
    description: "Configure preferences",
    disabled: true,
    badge: "Soon",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const hasSuperAdminPermission = authClient.organization.checkRolePermission({
    permissions: Permissions.superadmin.all,
    role: "superadmin",
  });

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const menuItems: MenuItem[] = [
    ...BASE_ADMIN_MENU_ITEMS,
    ...(hasSuperAdminPermission ? SUPER_ADMIN_MENU_ITEMS : []),
    ...INACTIVE_MENU_ITEMS,
  ];

  return (
    <aside className="sticky top-0 h-screen w-72 border-r bg-card/50 p-6 flex-shrink-0 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-1">Admin</h2>
        <p className="text-sm text-muted-foreground">Manage your system</p>
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

