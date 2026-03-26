"use client";

import { HorizontalNav } from "@/components/horizontal-nav";
import { getSettingsNavItems } from "@/features/settings/lib/settings-nav-items";
import { useTranslations } from "next-intl";

export function SettingsNav() {
  const t = useTranslations("settingsNav");
  const items = getSettingsNavItems(t).map((item) => ({
    href: item.href,
    icon: item.icon,
    label: item.label,
  }));

  return (
    <div className="md:hidden">
      <HorizontalNav items={items} ariaLabel={t("ariaLabel")} />
    </div>
  );
}
