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
  ShieldCheckIcon,
  Users2Icon,
  UsersIcon,
} from "lucide-react";

const BASE_NAV_ITEMS = [
  { href: "/admin/users", icon: UsersIcon, label: "Users" },
  { href: "/admin/teams", icon: Users2Icon, label: "Teams" },
  { href: "/admin/compliance", icon: ShieldCheckIcon, label: "Compliance" },
  { href: "/admin/audit-logs", icon: FileTextIcon, label: "Audit Logs" },
  { href: "/admin/agent-analytics", icon: BarChart3Icon, label: "Analytics" },
  { href: "/admin/agent-metrics", icon: ActivityIcon, label: "Metrics" },
];

const SUPER_ADMIN_NAV_ITEMS = [
  { href: "/admin/agent-config", icon: BotIcon, label: "Agent Config" },
  { href: "/admin/organizations", icon: Building2Icon, label: "Organizations" },
];

export function AdminNav() {
  const hasSuperAdminPermission = authClient.organization.checkRolePermission({
    permissions: Permissions.superadmin.all,
    role: "superadmin",
  });

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(hasSuperAdminPermission ? SUPER_ADMIN_NAV_ITEMS : []),
  ];

  return <HorizontalNav items={navItems} ariaLabel="Admin navigation" />;
}
