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
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

interface MenuItemDef {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  disabled?: boolean;
  badgeKey?: string;
}

interface MenuItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  disabled?: boolean;
  badge?: string;
}

const BASE_ADMIN_MENU_ITEMS: MenuItemDef[] = [
  {
    href: "/admin/users",
    icon: UsersIcon,
    titleKey: "userManagement",
    descriptionKey: "userManagementDescription",
  },
  {
    href: "/admin/audit-logs",
    icon: FileTextIcon,
    titleKey: "auditLogs",
    descriptionKey: "auditLogsDescription",
  },
  {
    href: "/admin/agent-analytics",
    icon: BarChart3Icon,
    titleKey: "userAnalytics",
    descriptionKey: "userAnalyticsDescription",
  },
  {
    href: "/admin/agent-metrics",
    icon: ActivityIcon,
    titleKey: "agentMetrics",
    descriptionKey: "agentMetricsDescription",
  },
];

// Only show Organizations for superadmins
const SUPER_ADMIN_MENU_ITEMS: MenuItemDef[] = [
  {
    href: "/admin/agent-config",
    icon: BotIcon,
    titleKey: "agentConfiguration",
    descriptionKey: "agentConfigurationDescription",
  },
  {
    href: "/admin/organizations",
    icon: Building2Icon,
    titleKey: "organizations",
    descriptionKey: "organizationsDescription",
  },
];

const INACTIVE_MENU_ITEMS: MenuItemDef[] = [
  {
    href: "#",
    icon: SettingsIcon,
    titleKey: "systemSettings",
    descriptionKey: "systemSettingsDescription",
    disabled: true,
    badgeKey: "soonBadge",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("adminSidebar");
  const hasSuperAdminPermission = authClient.organization.checkRolePermission({
    permissions: Permissions.superadmin.all,
    role: "superadmin",
  });

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const menuItemDefs: MenuItemDef[] = [
    ...BASE_ADMIN_MENU_ITEMS,
    ...(hasSuperAdminPermission ? SUPER_ADMIN_MENU_ITEMS : []),
    ...INACTIVE_MENU_ITEMS,
  ];

  const menuItems: MenuItem[] = menuItemDefs.map((item) => ({
    href: item.href,
    icon: item.icon,
    title: t(item.titleKey),
    description: t(item.descriptionKey),
    disabled: item.disabled,
    badge: item.badgeKey ? t(item.badgeKey) : undefined,
  }));

  return (
    <aside className="sticky top-0 h-screen w-72 border-r bg-card/50 p-6 flex-shrink-0 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-1">{t("heading")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
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
