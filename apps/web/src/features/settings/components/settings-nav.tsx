"use client";

import { HorizontalNav } from "@/components/horizontal-nav";
import { SETTINGS_NAV_ITEMS } from "@/features/settings/lib/settings-nav-items";

export function SettingsNav() {
  const items = SETTINGS_NAV_ITEMS.map((item) => ({
    href: item.href,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <div className="md:hidden">
      <HorizontalNav items={items} ariaLabel="Settings navigation" />
    </div>
  );
}
