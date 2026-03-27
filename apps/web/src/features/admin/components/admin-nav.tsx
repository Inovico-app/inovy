"use client";

import { HorizontalNav } from "@/components/horizontal-nav";
import { authClient } from "@/lib/auth-client";
import { Permissions } from "@/lib/rbac/permissions";
import {
  ActivityIcon,
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  FileTextIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  Users2Icon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface NavItemDef {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

const BASE_NAV_ITEMS: NavItemDef[] = [
  { href: "/admin/users", icon: UsersIcon, labelKey: "users" },
  { href: "/admin/teams", icon: Users2Icon, labelKey: "teams" },
  { href: "/admin/compliance", icon: ShieldCheckIcon, labelKey: "compliance" },
  { href: "/admin/audit-logs", icon: FileTextIcon, labelKey: "auditLogs" },
  {
    href: "/admin/agent-analytics",
    icon: BarChart3Icon,
    labelKey: "analytics",
  },
  { href: "/admin/agent-metrics", icon: ActivityIcon, labelKey: "metrics" },
  { href: "/admin/feedback", icon: MessageSquareIcon, labelKey: "feedback" },
];

const SUPER_ADMIN_NAV_ITEMS: NavItemDef[] = [
  { href: "/admin/agent-config", icon: BotIcon, labelKey: "agentConfig" },
  {
    href: "/admin/organizations",
    icon: Building2Icon,
    labelKey: "organizations",
  },
];

export function AdminNav() {
  const t = useTranslations("adminNav");
  const hasSuperAdminPermission = authClient.organization.checkRolePermission({
    permissions: Permissions.superadmin.all,
    role: "superadmin",
  });

  const navItemDefs = [
    ...BASE_NAV_ITEMS,
    ...(hasSuperAdminPermission ? SUPER_ADMIN_NAV_ITEMS : []),
  ];

  const navItems = navItemDefs.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: t(item.labelKey),
  }));

  return <HorizontalNav items={navItems} ariaLabel={t("ariaLabel")} />;
}
