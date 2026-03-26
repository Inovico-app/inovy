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

interface SettingsNavItemDef {
  href: string;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey?: string;
}

const SETTINGS_NAV_ITEM_DEFS: readonly SettingsNavItemDef[] = [
  {
    href: "/settings",
    icon: LayoutDashboardIcon,
    labelKey: "overview",
    descriptionKey: "overviewDescription",
  },
  {
    href: "/settings/profile",
    icon: UserIcon,
    labelKey: "profile",
    descriptionKey: "profileDescription",
  },
  {
    href: "/settings/organization",
    icon: Building2Icon,
    labelKey: "organization",
    descriptionKey: "organizationDescription",
  },
  {
    href: "/settings/agent",
    icon: BotIcon,
    labelKey: "agent",
    descriptionKey: "agentDescription",
  },
  {
    href: "/settings/bot",
    icon: VideoIcon,
    labelKey: "notetaker",
    descriptionKey: "notetakerDescription",
  },
  {
    href: "/settings/integrations",
    icon: SettingsIcon,
    labelKey: "integrations",
    descriptionKey: "integrationsDescription",
  },
] as const;

export function getSettingsNavItems(
  t: (key: string) => string,
): SettingsNavItem[] {
  return SETTINGS_NAV_ITEM_DEFS.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: t(item.labelKey),
    description: item.descriptionKey ? t(item.descriptionKey) : undefined,
  }));
}
