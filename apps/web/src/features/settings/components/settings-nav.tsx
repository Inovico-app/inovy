"use client";

import { HorizontalNav } from "@/components/horizontal-nav";
import {
  BotIcon,
  Building2Icon,
  SettingsIcon,
  UserIcon,
  VideoIcon,
} from "lucide-react";

const SETTINGS_NAV_ITEMS = [
  { href: "/settings/profile", icon: UserIcon, label: "Profile" },
  { href: "/settings/organization", icon: Building2Icon, label: "Organization" },
  { href: "/settings/agent", icon: BotIcon, label: "Agent" },
  { href: "/settings/bot", icon: VideoIcon, label: "Bot" },
  { href: "/settings/integrations", icon: SettingsIcon, label: "Integrations" },
];

export function SettingsNav() {
  return (
    <HorizontalNav items={SETTINGS_NAV_ITEMS} ariaLabel="Settings navigation" />
  );
}
