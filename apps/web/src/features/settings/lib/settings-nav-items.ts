import type { LucideIcon } from "lucide-react";
import {
  BotIcon,
  Building2Icon,
  LayoutDashboardIcon,
  SettingsIcon,
  UserIcon,
  VideoIcon,
} from "lucide-react";

export interface SettingsNavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
}

export const SETTINGS_NAV_ITEMS = [
  {
    href: "/settings",
    icon: LayoutDashboardIcon,
    label: "Overview",
    description: "Settings overview and status",
  },
  {
    href: "/settings/profile",
    icon: UserIcon,
    label: "Profile",
    description: "Manage your personal account",
  },
  {
    href: "/settings/organization",
    icon: Building2Icon,
    label: "Organization",
    description: "View organization information",
  },
  {
    href: "/settings/agent",
    icon: BotIcon,
    label: "Agent",
    description: "Browse knowledge base documents",
  },
  {
    href: "/settings/bot",
    icon: VideoIcon,
    label: "Notetaker",
    description: "Configure notetaker assistant preferences",
  },
  {
    href: "/settings/integrations",
    icon: SettingsIcon,
    label: "Integrations",
    description: "Manage third-party connections",
  },
] as const satisfies readonly SettingsNavItem[];
